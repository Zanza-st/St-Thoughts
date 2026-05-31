import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        Alert.alert('Check your email', 'We sent a confirmation link to ' + email)
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.root} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.wordmark}>ST THOUGHTS</Text>
          <Text style={s.wordmarkSub}>idea network</Text>
          <Text style={s.tagline}>Where raw ideas find the people they need.</Text>
        </View>

        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, mode === 'login' && s.tabOn]} onPress={() => setMode('login')}>
            <Text style={[s.tabText, mode === 'login' && s.tabTextOn]}>SIGN IN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mode === 'signup' && s.tabOn]} onPress={() => setMode('signup')}>
            <Text style={[s.tabText, mode === 'signup' && s.tabTextOn]}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.input}
          placeholder="email"
          placeholderTextColor="#505050"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TextInput
          style={s.input}
          placeholder="password"
          placeholderTextColor="#505050"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
          }
        </TouchableOpacity>

        <Text style={s.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  container: { padding: 22, paddingTop: 80, paddingBottom: 40 },
  hero: { marginBottom: 40 },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: '#c4a882', letterSpacing: 3 },
  wordmarkSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050', letterSpacing: 4, marginTop: 4 },
  tagline: { fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 20, color: '#888', marginTop: 20, lineHeight: 28 },
  tabs: { flexDirection: 'row', marginBottom: 24, borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, overflow: 'hidden' },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabOn: { backgroundColor: '#1a1410' },
  tabText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050', letterSpacing: 1 },
  tabTextOn: { color: '#c4a882' },
  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#efefef', fontSize: 15,
    fontFamily: 'DMSans_400Regular', marginBottom: 10,
  },
  btn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_500Medium' },
  legal: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#3a3a3a', textAlign: 'center', marginTop: 20, lineHeight: 16 },
})
