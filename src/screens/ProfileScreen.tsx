import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, ScrollView, Modal,
} from 'react-native'
import { supabase, Profile, Idea } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const ROLES = [
  { key: 'idea_person', label: 'Idea person' },
  { key: 'builder', label: 'Builder' },
  { key: 'investor', label: 'Investor / scout' },
  { key: 'collaborator', label: 'Collaborator' },
]

function EditProfileModal({ visible, profile, onClose, onSaved }: {
  visible: boolean
  profile: Profile | null
  onClose: () => void
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [role, setRole] = useState(profile?.role ?? 'idea_person')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setRole(profile.role ?? 'idea_person')
    }
  }, [profile])

  const save = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      role,
    }).eq('id', profile?.id)
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    onSaved()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={ps.modal} contentContainerStyle={ps.modalContent} keyboardShouldPersistTaps="handled">
        <View style={ps.modalHeader}>
          <Text style={ps.modalTitle}>Edit profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={ps.label}>DISPLAY NAME</Text>
        <TextInput
          style={ps.input}
          placeholder="your name"
          placeholderTextColor="#505050"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={ps.label}>BIO</Text>
        <TextInput
          style={[ps.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="a line or two about you..."
          placeholderTextColor="#505050"
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Text style={ps.label}>ROLE</Text>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[ps.roleOpt, role === r.key && ps.roleOptOn]}
            onPress={() => setRole(r.key as any)}
          >
            <Text style={[ps.roleName, role === r.key && ps.roleNameOn]}>{r.label}</Text>
            {role === r.key && <Text style={{ color: '#c4a882' }}>✓</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={ps.saveBtn} onPress={save} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={ps.saveBtnText}>Save changes</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  )
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [bookmarks, setBookmarks] = useState<Idea[]>([])
  const [tab, setTab] = useState<'ideas' | 'bookmarks'>('ideas')
  const [editVisible, setEditVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    const { data: myIdeas } = await supabase
      .from('ideas')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })

    setIdeas(myIdeas ?? [])

    const { data: bkmData } = await supabase
      .from('idea_bookmarks')
      .select('idea:ideas(*, author:profiles(handle))')
      .eq('user_id', user.id)
      .order('id', { ascending: false })

    setBookmarks((bkmData ?? []).map((b: any) => b.idea))
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const signOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const activeIdeas = tab === 'ideas' ? ideas : bookmarks

  return (
    <View style={ps.root}>
      <View style={ps.topbar}>
        <Text style={ps.wordmark}>PROFILE</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={ps.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeIdeas}
        keyExtractor={(i) => i.id}
        contentContainerStyle={ps.feedList}
        ListHeaderComponent={
          <View>
            <View style={ps.profileCard}>
              <View style={ps.avatarWrap}>
                <View style={ps.avatar}>
                  <Text style={ps.avatarText}>{profile?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              </View>
              <View style={ps.profileInfo}>
                <Text style={ps.displayName}>{profile?.display_name || '@' + profile?.handle}</Text>
                <Text style={ps.handle}>@{profile?.handle}</Text>
                {profile?.bio ? <Text style={ps.bio}>{profile.bio}</Text> : null}
                <View style={ps.statsRow}>
                  <View style={ps.stat}>
                    <Text style={ps.statVal}>{profile?.total_ideas_posted ?? ideas.length}</Text>
                    <Text style={ps.statLabel}>IDEAS</Text>
                  </View>
                  <View style={ps.stat}>
                    <Text style={ps.statVal}>{profile?.total_votes_received ?? 0}</Text>
                    <Text style={ps.statLabel}>VOTES</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={ps.editBtn} onPress={() => setEditVisible(true)}>
                <Text style={ps.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={ps.tabs}>
              {(['ideas', 'bookmarks'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[ps.tabBtn, tab === t && ps.tabBtnOn]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[ps.tabBtnText, tab === t && ps.tabBtnTextOn]}>
                    {t === 'ideas' ? `IDEAS (${ideas.length})` : `SAVED (${bookmarks.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={ps.empty}>
              <Text style={ps.emptyText}>{tab === 'ideas' ? 'No ideas posted yet.' : 'No saved ideas.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={ps.ideaRow}
            onPress={() => navigation.navigate('IdeaDetail', { idea: item })}
            activeOpacity={0.85}
          >
            <Text style={ps.ideaTitle} numberOfLines={2}>{item.title}</Text>
            <View style={ps.ideaMeta}>
              <Text style={ps.ideaMetaText}>↑ {item.vote_count}</Text>
              <Text style={ps.ideaMetaText}>💬 {item.comment_count}</Text>
              <Text style={ps.ideaMetaText}>🔥 {item.fire_count}</Text>
              <Text style={ps.ideaTime}>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <EditProfileModal
        visible={editVisible}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSaved={fetchProfile}
      />
    </View>
  )
}

const ps = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#c4a882', letterSpacing: 2 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  feedList: { paddingBottom: 80 },
  profileCard: {
    flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', gap: 14,
  },
  avatarWrap: {},
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: 'BebasNeue_400Regular' },
  profileInfo: { flex: 1 },
  displayName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17, color: '#efefef', marginBottom: 2 },
  handle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#888', marginBottom: 6 },
  bio: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: {},
  statVal: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: '#c4a882', letterSpacing: 1 },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, color: '#505050', letterSpacing: 1 },
  editBtn: { borderWidth: 1, borderColor: '#383838', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, height: 34 },
  editBtnText: { color: '#888', fontFamily: 'DMSans_400Regular', fontSize: 13 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center' },
  tabBtnOn: { borderBottomWidth: 2, borderBottomColor: '#c4a882' },
  tabBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050', letterSpacing: 1 },
  tabBtnTextOn: { color: '#c4a882' },
  ideaRow: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#1c1c1c',
  },
  ideaTitle: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 15, color: '#efefef', marginBottom: 8 },
  ideaMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ideaMetaText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  ideaTime: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#383838', marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#505050' },
  modal: { flex: 1, backgroundColor: '#0c0c0c' },
  modalContent: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#efefef' },
  label: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#efefef', fontSize: 14,
    fontFamily: 'DMSans_400Regular', marginBottom: 16,
  },
  roleOpt: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 13, backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, marginBottom: 8,
  },
  roleOptOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  roleName: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#888' },
  roleNameOn: { color: '#c4a882' },
  saveBtn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans_500Medium' },
})
