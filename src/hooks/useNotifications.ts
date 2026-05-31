import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from '../lib/supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}

export function useNotifications() {
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    registerForPushNotifications().then(async (token) => {
      if (!token) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Store token on profile for server-side push (extend profiles table with push_token column)
      await supabase.from('profiles').update({ push_token: token } as any).eq('id', user.id)
    })

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Handle foreground notifications
      console.log('Notification received:', notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // Handle tap on notification — navigate if needed
      console.log('Notification tapped:', response)
    })

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])
}
