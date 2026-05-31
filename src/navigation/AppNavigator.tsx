import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'

import AuthScreen from '../screens/AuthScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import FeedScreen from '../screens/FeedScreen'
import IdeaDetailScreen from '../screens/IdeaDetailScreen'
import MarketScreen from '../screens/MarketScreen'
import GroupsScreen from '../screens/GroupsScreen'
import GroupFeedScreen from '../screens/GroupFeedScreen'
import ActivityScreen from '../screens/ActivityScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const icons: Record<string, string> = {
    Feed: '◈', Market: '◇', Groups: '⊕', Activity: '◉', Me: '○',
  }
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View>
        <Text style={{ fontSize: 20, color: focused ? '#c4a882' : '#505050' }}>{icons[name]}</Text>
        {badge && badge > 0 ? (
          <View style={{
            position: 'absolute', top: -4, right: -8,
            backgroundColor: '#c4a882', borderRadius: 8,
            minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#0c0c0c', fontSize: 9, fontFamily: 'DMSans_500Medium' }}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, letterSpacing: 0.5, color: focused ? '#c4a882' : '#505050' }}>
        {name.toLowerCase()}
      </Text>
    </View>
  )
}

function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedMain" component={FeedScreen} />
      <Stack.Screen name="IdeaDetail" component={IdeaDetailScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  )
}

function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="GroupFeed" component={GroupFeedScreen} />
      <Stack.Screen name="IdeaDetail" component={IdeaDetailScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  )
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="IdeaDetail" component={IdeaDetailScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const loadUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    }
    loadUnread()

    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        setUnreadCount((c) => c + 1)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, loadUnread)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#141414',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon
            name={route.name}
            focused={focused}
            badge={route.name === 'Activity' ? unreadCount : undefined}
          />
        ),
      })}
    >
      <Tab.Screen name="Feed" component={FeedStack} />
      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen name="Groups" component={GroupsStack} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Me" component={ProfileStack} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [session, setSession] = useState<any>(undefined)
  const [hasProfile, setHasProfile] = useState<boolean>(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()
        setHasProfile(!!data)
      }
      setChecking(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()
        setHasProfile(!!data)
      } else {
        setHasProfile(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0c0c0c', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c4a882" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !hasProfile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
