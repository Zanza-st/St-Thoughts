import React from 'react'
import { useFonts } from 'expo-font'
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans'
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'
import { View, ActivityIndicator } from 'react-native'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMMono_400Regular,
    DMMono_500Medium,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0c0c0c', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c4a882" />
      </View>
    )
  }

  return <AppNavigator />
}
