import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useIdeas } from '../hooks/useIdeas'
import { Idea, supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'startup', label: 'Startup' },
  { key: 'creative', label: 'Creative' },
  { key: 'collab', label: 'Open to collab' },
  { key: 'trade', label: 'Trade' },
  { key: 'sale', label: 'For sale' },
]

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  startup:  { bg: '#130f1e', color: '#a78bfa' },
  creative: { bg: '#0c1a2e', color: '#60a5fa' },
  sale:     { bg: '#091f14', color: '#3ecf8e' },
  collab:   { bg: '#091f14', color: '#3ecf8e' },
  trade:    { bg: '#1c1100', color: '#f5a623' },
}

function Tag({ label }: { label: string }) {
  const ts = TAG_STYLES[label] ?? { bg: '#1c1c1c', color: '#888' }
  return (
    <View style={[tagS.tag, { backgroundColor: ts.bg }]}>
      <Text style={[tagS.text, { color: ts.color }]}>{label}</Text>
    </View>
  )
}
const tagS = StyleSheet.create({
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, marginRight: 5 },
  text: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 0.5 },
})

function IdeaCard({ idea, onPress, onVote, onFire }: {
  idea: Idea
  onPress: () => void
  onVote: () => void
  onFire: () => void
}) {
  const price = idea.listing?.asking_price_cents
    ? `$${(idea.listing.asking_price_cents / 100).toLocaleString()}`
    : null
  const barter = idea.listing?.barter_wants?.join(' · ') ?? null

  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cs.eyebrow}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Tag label={idea.category} />
          {idea.listing && <Tag label={idea.listing.listing_type === 'barter' ? 'trade' : 'sale'} />}
          {idea.is_collab_open && <Tag label="collab" />}
        </View>
        <Text style={cs.time}>
          {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
        </Text>
      </View>

      <View style={cs.authorRow}>
        <View style={[cs.av, { backgroundColor: '#7c3aed' }]}>
          <Text style={cs.avText}>{idea.author?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={cs.handle}>@{idea.author?.handle}</Text>
      </View>

      <Text style={cs.title}>{idea.title}</Text>
      <Text style={cs.body} numberOfLines={3}>{idea.body}</Text>

      {(price || barter) && (
        <View style={cs.pricingRow}>
          {price && <Text style={cs.priceGreen}>{price}</Text>}
          {price && barter && <Text style={cs.priceSep}>·</Text>}
          {barter && <Text style={cs.priceAmber}>{barter}</Text>}
        </View>
      )}

      <View style={cs.actions}>
        <TouchableOpacity style={cs.actBtn} onPress={onVote}>
          <Text style={[cs.actIcon, idea.user_voted && cs.voted]}>↑</Text>
          <Text style={[cs.actCount, idea.user_voted && cs.voted]}>{idea.vote_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cs.actBtn}>
          <Text style={cs.actIcon}>💬</Text>
          <Text style={cs.actCount}>{idea.comment_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cs.actBtn} onPress={onFire}>
          <Text style={[cs.actIcon, idea.user_fired && cs.fired]}>🔥</Text>
          <Text style={[cs.actCount, idea.user_fired && cs.fired]}>{idea.fire_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  av: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avText: { color: '#fff', fontSize: 10, fontFamily: 'DMSans_500Medium' },
  handle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#888' },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17, color: '#efefef', lineHeight: 24, marginBottom: 6 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 10 },
  pricingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 8, padding: 8, marginBottom: 10,
  },
  priceGreen: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#3ecf8e' },
  priceAmber: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#f5a623' },
  priceSep: { color: '#2a2a2a', marginHorizontal: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8 },
  actIcon: { fontSize: 15, color: '#505050' },
  actCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  voted: { color: '#a78bfa' },
  fired: { color: '#f5a623' },
})

export default function FeedScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [composeVisible, setComposeVisible] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('startup')

  const filter = {
    category: ['startup', 'creative', 'tech', 'commerce', 'film', 'design'].includes(activeFilter)
      ? activeFilter : undefined,
    is_collab_open: activeFilter === 'collab' ? true : undefined,
  }

  const { ideas, loading, refresh, toggleVote, toggleFire } = useIdeas(filter)

  const postIdea = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !composeText.trim()) return
    await supabase.from('ideas').insert({
      author_id: user.id,
      title: composeText.split('\n')[0].substring(0, 120),
      body: composeText,
      category: selectedCategory,
    })
    setComposeText('')
    setComposeVisible(false)
    refresh()
  }

  return (
    <View style={fs.root}>
      <View style={fs.topbar}>
        <View>
          <Text style={fs.wordmark}>ST THOUGHTS</Text>
          <Text style={fs.wordmarkSub}>idea network</Text>
        </View>
        <TouchableOpacity onPress={() => setComposeVisible(true)} style={fs.dropBtn}>
          <Text style={fs.dropBtnText}>+ Drop idea</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fs.filterStrip}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[fs.fpill, activeFilter === item.key && fs.fpillOn]}
            onPress={() => setActiveFilter(item.key)}
          >
            <Text style={[fs.fpillText, activeFilter === item.key && fs.fpillTextOn]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={ideas}
        keyExtractor={(i) => i.id}
        contentContainerStyle={fs.feedList}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#c4a882" />}
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={fs.modal}>
          <View style={fs.modalHeader}>
            <Text style={fs.modalTitle}>Drop a thought</Text>
            <TouchableOpacity onPress={() => setComposeVisible(false)}>
              <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={fs.composeInput}
            placeholder="what's the idea? be concise — a tight pitch beats a long one..."
            placeholderTextColor="#505050"
            value={composeText}
            onChangeText={setComposeText}
            multiline
            autoFocus
          />
          <View style={fs.categoryRow}>
            {['startup', 'creative', 'tech'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[fs.catChip, selectedCategory === c && fs.catChipOn]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[fs.catChipText, selectedCategory === c && fs.catChipTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={fs.postBtn} onPress={postIdea}>
            <Text style={fs.postBtnText}>Post idea</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const fs = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#c4a882', letterSpacing: 2 },
  wordmarkSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 3, marginTop: 2 },
  dropBtn: { backgroundColor: '#8a6840', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  dropBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  filterStrip: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  fpill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#383838', marginRight: 6 },
  fpillOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  fpillText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  fpillTextOn: { color: '#c4a882' },
  feedList: { padding: 14 },
  modal: { flex: 1, backgroundColor: '#0c0c0c', padding: 20, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#efefef' },
  composeInput: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 12,
    padding: 14, color: '#efefef', fontSize: 15, fontFamily: 'DMSans_400Regular',
    minHeight: 120, textAlignVertical: 'top', marginBottom: 12,
  },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#383838' },
  catChipOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  catChipText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  catChipTextOn: { color: '#c4a882' },
  postBtn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 15, alignItems: 'center' },
  postBtnText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 15 },
})
