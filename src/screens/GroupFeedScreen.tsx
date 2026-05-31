import React, { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native'
import { useIdeas } from '../hooks/useIdeas'
import { Idea, supabase, Group } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

function IdeaCard({ idea, onPress, onVote, onFire }: {
  idea: Idea
  onPress: () => void
  onVote: () => void
  onFire: () => void
}) {
  return (
    <TouchableOpacity style={gf.card} onPress={onPress} activeOpacity={0.85}>
      <View style={gf.eyebrow}>
        <View style={gf.categoryBadge}>
          <Text style={gf.categoryText}>{idea.category}</Text>
        </View>
        <Text style={gf.time}>{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</Text>
      </View>
      <View style={gf.authorRow}>
        <View style={[gf.av, { backgroundColor: '#7c3aed' }]}>
          <Text style={gf.avText}>{idea.author?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={gf.handle}>@{idea.author?.handle}</Text>
      </View>
      <Text style={gf.title}>{idea.title}</Text>
      <Text style={gf.body} numberOfLines={3}>{idea.body}</Text>
      <View style={gf.actions}>
        <TouchableOpacity style={gf.actBtn} onPress={onVote}>
          <Text style={[gf.actIcon, idea.user_voted && gf.voted]}>↑</Text>
          <Text style={[gf.actCount, idea.user_voted && gf.voted]}>{idea.vote_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={gf.actBtn}>
          <Text style={gf.actIcon}>💬</Text>
          <Text style={gf.actCount}>{idea.comment_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={gf.actBtn} onPress={onFire}>
          <Text style={[gf.actIcon, idea.user_fired && gf.fired]}>🔥</Text>
          <Text style={[gf.actCount, idea.user_fired && gf.fired]}>{idea.fire_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function GroupFeedScreen({ route, navigation }: any) {
  const { group }: { group: Group } = route.params
  const [composeVisible, setComposeVisible] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('startup')

  const { ideas, loading, refresh, toggleVote, toggleFire } = useIdeas({ group_id: group.id })

  const postIdea = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !composeText.trim()) return
    await supabase.from('ideas').insert({
      author_id: user.id,
      title: composeText.split('\n')[0].substring(0, 120),
      body: composeText,
      category: selectedCategory,
      group_id: group.id,
    })
    setComposeText('')
    setComposeVisible(false)
    refresh()
  }

  return (
    <View style={gf.root}>
      <View style={gf.topbar}>
        <TouchableOpacity style={gf.backBtn} onPress={() => navigation.goBack()}>
          <Text style={gf.backText}>← groups</Text>
        </TouchableOpacity>
        <View style={gf.groupInfo}>
          <View style={[gf.colorDot, { backgroundColor: group.color }]} />
          <Text style={gf.groupName}>{group.name}</Text>
        </View>
        <TouchableOpacity style={gf.dropBtn} onPress={() => setComposeVisible(true)}>
          <Text style={gf.dropBtnText}>+ Drop</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ideas}
        keyExtractor={(i) => i.id}
        contentContainerStyle={gf.feedList}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#c4a882" />}
        ListEmptyComponent={
          !loading ? (
            <View style={gf.empty}>
              <Text style={gf.emptyText}>No ideas yet.</Text>
              <Text style={gf.emptySub}>Drop the first idea in this group.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <IdeaCard
            idea={item}
            onPress={() => navigation.navigate('IdeaDetail', { idea: item })}
            onVote={() => toggleVote(item.id)}
            onFire={() => toggleFire(item.id)}
          />
        )}
      />

      <Modal visible={composeVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={gf.modal}>
          <View style={gf.modalHeader}>
            <Text style={gf.modalTitle}>Drop a thought</Text>
            <TouchableOpacity onPress={() => setComposeVisible(false)}>
              <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={gf.composeInput}
            placeholder="what's the idea?"
            placeholderTextColor="#505050"
            value={composeText}
            onChangeText={setComposeText}
            multiline
            autoFocus
          />
          <View style={gf.categoryRow}>
            {['startup', 'creative', 'tech', 'commerce', 'film', 'design'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[gf.catChip, selectedCategory === c && gf.catChipOn]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[gf.catChipText, selectedCategory === c && gf.catChipTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={gf.postBtn} onPress={postIdea}>
            <Text style={gf.postBtnText}>Post idea</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const gf = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  backBtn: {},
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  groupInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: '#c4a882', letterSpacing: 1 },
  dropBtn: { backgroundColor: '#8a6840', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dropBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  feedList: { padding: 14, paddingBottom: 80 },
  card: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { backgroundColor: '#1c1c1c', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  categoryText: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#888', letterSpacing: 0.5 },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  av: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avText: { color: '#fff', fontSize: 10, fontFamily: 'DMSans_500Medium' },
  handle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#888' },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17, color: '#efefef', lineHeight: 24, marginBottom: 6 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 4 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8 },
  actIcon: { fontSize: 15, color: '#505050' },
  actCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  voted: { color: '#a78bfa' },
  fired: { color: '#f5a623' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 18, color: '#505050', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#383838' },
  modal: { flex: 1, backgroundColor: '#0c0c0c', padding: 20, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#efefef' },
  composeInput: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12,
    padding: 14, color: '#efefef', fontSize: 15, fontFamily: 'DMSans_400Regular',
    minHeight: 120, textAlignVertical: 'top', marginBottom: 12,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#383838' },
  catChipOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  catChipText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  catChipTextOn: { color: '#c4a882' },
  postBtn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 15, alignItems: 'center' },
  postBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 15 },
})
