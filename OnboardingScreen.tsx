import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { supabase } from '../lib/supabase'

const INTERESTS = [
  { key: 'startups', label: 'Startups', icon: '🚀' },
  { key: 'creative', label: 'Creative', icon: '🎨' },
  { key: 'tech', label: 'Tech', icon: '💻' },
  { key: 'commerce', label: 'Commerce', icon: '🏪' },
  { key: 'film', label: 'Film', icon: '🎬' },
  { key: 'design', label: 'Design', icon: '✏️' },
]

const ROLES = [
  { key: 'idea_person', label: 'Idea person', sub: 'YOU COME WITH THE VISION' },
  { key: 'builder', label: 'Builder', sub: 'YOU MAKE THINGS REAL' },
  { key: 'investor', label: 'Investor / scout', sub: 'YOU BACK WHAT YOU BELIEVE IN' },
  { key: 'collaborator', label: 'Collaborator', sub: 'YOU FIND YOUR PEOPLE HERE' },
]

type Step = 'identity' | 'interests' | 'role'

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('identity')
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [role, setRole] = useState<string>('idea_person')
  const [loading, setLoading] = useState(false)

  const stepIndex = { identity: 0, interests: 1, role: 2 }[step]

  const toggleInterest = (key: string) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    )
  }

  const finish = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        handle: handle.replace('@', '').toLowerCase(),
        display_name: displayName || null,
        role,
      })
      if (profileError) throw profileError

      if (interests.length > 0) {
        await supabase.from('profile_interests').insert(
          interests.map((interest) => ({ profile_id: user.id, interest }))
        )
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {step === 'identity' && (
        <>
          <View style={s.hero}>
            <Text style={s.wordmark}>ST THOUGHTS</Text>
            <Text style={s.wordmarkSub}>idea network</Text>
            <Text style={s.tagline}>Where raw ideas find the people they need.</Text>
          </View>

          <View style={s.stepDots}>
            {['identity', 'interests', 'role'].map((s_, i) => (
              <View key={s_} style={[s.dot, i <= stepIndex && s.dotActive, i < stepIndex && s.dotDone]} />
            ))}
          </View>

          <Text style={s.question}>What do we call you?</Text>
          <Text style={s.subtext}>This is your handle on ST Thoughts. Pick something that feels like you.</Text>

          <TextInput
            style={s.input}
            placeholder="@yourhandle"
            placeholderTextColor="#505050"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="display name (optional)"
            placeholderTextColor="#505050"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <TouchableOpacity style={s.btnPrimary} onPress={() => handle.length > 1 && setStep('interests')}>
            <Text style={s.btnPrimaryText}>Continue</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'interests' && (
        <>
          <Text style={[s.wordmark, { fontSize: 30 }]}>WHAT MOVES YOU?</Text>

          <View style={s.stepDots}>
            {['identity', 'interests', 'role'].map((s_, i) => (
              <View key={s_} style={[s.dot, i <= stepIndex && s.dotActive, i < stepIndex && s.dotDone]} />
            ))}
          </View>

          <Text style={s.subtext}>Pick what you want to see in your feed. You can always change this.</Text>

          <View style={s.interestGrid}>
            {INTERESTS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[s.interestChip, interests.includes(item.key) && s.interestChipOn]}
                onPress={() => toggleInterest(item.key)}
              >
                <Text style={s.interestIcon}>{item.icon}</Text>
                <Text style={[s.interestLabel, interests.includes(item.key) && s.interestLabelOn]}>
                  {item.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.btnPrimary} onPress={() => setStep('role')}>
            <Text style={s.btnPrimaryText}>Continue</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'role' && (
        <>
          <Text style={[s.wordmark, { fontSize: 30 }]}>HOW DO YOU SHOW UP?</Text>

          <View style={s.stepDots}>
            {['identity', 'interests', 'role'].map((s_, i) => (
              <View key={s_} style={[s.dot, i <= stepIndex && s.dotActive, i < stepIndex && s.dotDone]} />
            ))}
          </View>

          <Text style={s.subtext}>This shapes what the app surfaces for you.</Text>

          {ROLES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.roleOpt, role === item.key && s.roleOptOn]}
              onPress={() => setRole(item.key)}
            >
              <View style={s.roleText}>
                <Text style={[s.roleName, role === item.key && s.roleNameOn]}>{item.label}</Text>
                <Text style={s.roleSub}>{item.sub}</Text>
              </View>
              {role === item.key && <Text style={{ color: '#c4a882', fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[s.btnPrimary, { marginTop: 20 }]} onPress={finish} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnPrimaryText}>Enter ST Thoughts</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  container: { padding: 22, paddingTop: 48, paddingBottom: 40 },
  hero: { marginBottom: 24 },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 42, color: '#c4a882', letterSpacing: 3 },
  wordmarkSub: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#505050', letterSpacing: 4, marginTop: 4 },
  tagline: { fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 20, color: '#888', marginTop: 20, lineHeight: 28 },
  stepDots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#2a2a2a' },
  dotActive: { backgroundColor: '#c4a882' },
  dotDone: { backgroundColor: '#8a6840' },
  question: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: '#efefef', marginBottom: 8 },
  subtext: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#888', marginBottom: 20, lineHeight: 20 },
  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#efefef', fontSize: 15,
    fontFamily: 'DMSans_300Light', marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: '#8a6840', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_500Medium' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  interestChip: {
    width: '47%', backgroundColor: '#1c1c1c', borderWidth: 1,
    borderColor: '#2a2a2a', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  interestChipOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  interestIcon: { fontSize: 22, marginBottom: 6 },
  interestLabel: { fontFamily: 'DMSans_300Light', fontSize: 11, color: '#888', letterSpacing: 1 },
  interestLabelOn: { color: '#c4a882' },
  roleOpt: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, marginBottom: 8,
  },
  roleOptOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  roleText: { flex: 1 },
  roleName: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#888' },
  roleNameOn: { color: '#c4a882' },
  roleSub: { fontFamily: 'DMSans_300Light', fontSize: 10, color: '#505050', marginTop: 2, letterSpacing: 1 },
})
