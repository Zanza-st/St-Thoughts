import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native'
import { supabase, Group } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const GROUP_COLORS = ['#a78bfa', '#60a5fa', '#3ecf8e', '#f5a623', '#f87171', '#c4a882']

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={gs.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[gs.colorBar, { backgroundColor: group.color }]} />
      <View style={gs.cardBody}>
        <View style={gs.cardTop}>
          <Text style={gs.groupName}>{group.name}</Text>
          <View style={[gs.roleBadge, { borderColor: group.color + '60' }]}>
            <Text style={[gs.roleText, { color: group.color }]}>{group.user_role?.toUpperCase()}</Text>
          </View>
        </View>
        {group.description ? (
          <Text style={gs.groupDesc} numberOfLines={2}>{group.description}</Text>
        ) : null}
        <Text style={gs.memberCount}>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</Text>
      </View>
    </TouchableOpacity>
  )
}

function CreateGroupModal({ visible, onClose, onCreated }: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) { Alert.alert('Enter a group name'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, color, created_by: user.id })
      .select()
      .single()

    if (error) { Alert.alert('Error', error.message); setLoading(false); return }

    await supabase.from('group_members').insert({
      group_id: group.id, user_id: user.id, role: 'owner',
    })

    setLoading(false)
    setName('')
    setDescription('')
    setColor(GROUP_COLORS[0])
    onCreated()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={gs.modal} contentContainerStyle={gs.modalContent} keyboardShouldPersistTaps="handled">
          <View style={gs.modalHeader}>
            <Text style={gs.modalTitle}>New group</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={gs.label}>GROUP NAME</Text>
          <TextInput
            style={gs.input}
            placeholder="e.g. Stealth Mode, Friday Hackers..."
            placeholderTextColor="#505050"
            value={name}
            onChangeText={setName}
          />

          <Text style={gs.label}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[gs.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="what is this group about?"
            placeholderTextColor="#505050"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={gs.label}>COLOR</Text>
          <View style={gs.colorRow}>
            {GROUP_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[gs.colorDot, { backgroundColor: c }, color === c && gs.colorDotOn]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity style={gs.createBtn} onPress={create} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={gs.createBtnText}>Create group</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function InviteModal({ visible, group, onClose }: {
  visible: boolean
  group: Group | null
  onClose: () => void
}) {
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)

  const invite = async () => {
    if (!handle.trim() || !group) return
    setLoading(true)
    const clean = handle.replace('@', '').toLowerCase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', clean)
      .single()

    if (!profile) {
      Alert.alert('Not found', `No user with handle @${clean}`)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('group_invites').insert({
      group_id: group.id,
      invited_by: user?.id,
      invited_user_id: profile.id,
    })

    setLoading(false)
    if (error?.code === '23505') {
      Alert.alert('Already invited', `@${clean} has already been invited.`)
    } else if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Invite sent', `@${clean} will see this in their activity.`)
      setHandle('')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={gs.modal}>
          <View style={[gs.modalContent, { paddingTop: 40 }]}>
            <View style={gs.modalHeader}>
              <Text style={gs.modalTitle}>Invite to {group?.name}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: '#888', fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={gs.label}>HANDLE</Text>
            <TextInput
              style={gs.input}
              placeholder="@theirhandle"
              placeholderTextColor="#505050"
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={gs.createBtn} onPress={invite} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={gs.createBtnText}>Send invite</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function GroupsScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createVisible, setCreateVisible] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<Group | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id)

    if (!memberships?.length) { setLoading(false); return }

    const groupIds = memberships.map((m) => m.group_id)
    const roleMap = new Map(memberships.map((m) => [m.group_id, m.role]))

    const { data } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    setGroups((data ?? []).map((g) => ({ ...g, user_role: roleMap.get(g.id) })))

    // Fetch pending invites
    const { data: invites } = await supabase
      .from('group_invites')
      .select('*, group:groups(name, color), inviter:profiles!invited_by(handle)')
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')

    setPendingInvites(invites ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const acceptInvite = async (invite: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('group_invites').update({ status: 'accepted' }).eq('id', invite.id)
    await supabase.from('group_members').insert({ group_id: invite.group_id, user_id: user.id })
    await supabase.from('groups').update({ member_count: invite.group.member_count + 1 }).eq('id', invite.group_id)
    fetchGroups()
  }

  const declineInvite = async (invite: any) => {
    await supabase.from('group_invites').update({ status: 'declined' }).eq('id', invite.id)
    fetchGroups()
  }

  return (
    <View style={gs.root}>
      <View style={gs.topbar}>
        <View>
          <Text style={gs.wordmark}>GROUPS</Text>
          <Text style={gs.wordmarkSub}>private · invite-only</Text>
        </View>
        <TouchableOpacity style={gs.newBtn} onPress={() => setCreateVisible(true)}>
          <Text style={gs.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(i) => i.id}
        contentContainerStyle={gs.feedList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchGroups} tintColor="#c4a882" />
        }
        ListHeaderComponent={
          pendingInvites.length > 0 ? (
            <View style={gs.invitesSection}>
              <Text style={gs.sectionLabel}>INVITES</Text>
              {pendingInvites.map((inv) => (
                <View key={inv.id} style={gs.inviteCard}>
                  <View style={[gs.colorDot, { backgroundColor: inv.group?.color ?? '#888', marginRight: 10 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={gs.inviteGroupName}>{inv.group?.name}</Text>
                    <Text style={gs.inviteFrom}>invited by @{inv.inviter?.handle}</Text>
                  </View>
                  <TouchableOpacity style={gs.acceptBtn} onPress={() => acceptInvite(inv)}>
                    <Text style={gs.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={gs.declineBtn} onPress={() => declineInvite(inv)}>
                    <Text style={gs.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={gs.empty}>
              <Text style={gs.emptyText}>No groups yet.</Text>
              <Text style={gs.emptySub}>Create a private group or wait for an invite.</Text>
              <TouchableOpacity style={gs.emptyBtn} onPress={() => setCreateVisible(true)}>
                <Text style={gs.emptyBtnText}>Create a group</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => {
              if (item.user_role === 'owner' || item.user_role === 'admin') {
                setInviteTarget(item)
              }
              navigation.navigate('GroupFeed', { group: item })
            }}
          />
        )}
      />

      <CreateGroupModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={fetchGroups}
      />
      <InviteModal
        visible={!!inviteTarget}
        group={inviteTarget}
        onClose={() => setInviteTarget(null)}
      />
    </View>
  )
}

const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#c4a882', letterSpacing: 2 },
  wordmarkSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 3, marginTop: 2 },
  newBtn: { backgroundColor: '#8a6840', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  feedList: { padding: 14, paddingBottom: 80 },
  card: {
    flexDirection: 'row', backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, marginBottom: 10, overflow: 'hidden',
  },
  colorBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  groupName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: '#efefef' },
  roleBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  roleText: { fontFamily: 'DMSans_400Regular', fontSize: 9, letterSpacing: 1 },
  groupDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#888', lineHeight: 18, marginBottom: 8 },
  memberCount: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050' },
  invitesSection: { marginBottom: 20 },
  sectionLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 2, marginBottom: 10 },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414',
    borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  inviteGroupName: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#efefef' },
  inviteFrom: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#888', marginTop: 2 },
  acceptBtn: { backgroundColor: '#3ecf8e22', borderWidth: 1, borderColor: '#3ecf8e44', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6 },
  acceptBtnText: { color: '#3ecf8e', fontFamily: 'DMSans_400Regular', fontSize: 12 },
  declineBtn: { borderWidth: 1, borderColor: '#38383844', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 6 },
  declineBtnText: { color: '#505050', fontFamily: 'DMSans_400Regular', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 18, color: '#505050', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#383838', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#8a6840', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotOn: { borderWidth: 2, borderColor: '#fff' },
  modal: { flex: 1, backgroundColor: '#0c0c0c' },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#efefef' },
  label: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#efefef', fontSize: 14,
    fontFamily: 'DMSans_400Regular', marginBottom: 16,
  },
  createBtn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  createBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans_500Medium' },
})
