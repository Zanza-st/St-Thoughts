import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'

import OnboardingScreen from '../screens/OnboardingScreen'
import FeedScreen from '../screens/FeedScreen'
import IdeaDetailScreen from '../screens/IdeaDetailScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '◈', Market: '◇', Groups: '⊕', Activity: '◉', Me: '○',
  }
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, color: focused ? '#c4a882' : '#505050' }}>{icons[name]}</Text>
      <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 0.5, color: focused ? '#c4a882' : '#505050' }}>
        {name.toLowerCase()}
      </Text>
    </View>
  )
}

function MainTabs() {
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
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Feed" component={FeedStack} />
      <Tab.Screen name="Market" component={PlaceholderScreen('MARKET', 'ideas · trades · barter')} />
      <Tab.Screen name="Groups" component={PlaceholderScreen('GROUPS', 'private · invite-only')} />
      <Tab.Screen name="Activity" component={PlaceholderScreen('ACTIVITY', "what's moving")} />
      <Tab.Screen name="Me" component={PlaceholderScreen('PROFILE', 'your ideas')} />
    </Tab.Navigator>
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

function PlaceholderScreen(title: string, sub: string) {
  return () => (
    <View style={{ flex: 1, backgroundColor: '#0c0c0c', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: '#c4a882', letterSpacing: 2 }}>{title}</Text>
      <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 11, color: '#505050', letterSpacing: 2, marginTop: 6 }}>{sub}</Text>
    </View>
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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
          <Stack.Screen name="Auth" component={OnboardingScreen} />
        ) : !hasProfile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
