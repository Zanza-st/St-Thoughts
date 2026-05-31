import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { supabase, Comment, Idea } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

export default function IdeaDetailScreen({ route, navigation }: any) {
  const { idea: initialIdea }: { idea: Idea } = route.params
  const [idea, setIdea] = useState<Idea>(initialIdea)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [userRating, setUserRating] = useState(initialIdea.user_rated ?? 0)
  const [voted, setVoted] = useState(initialIdea.user_voted ?? false)
  const [fired, setFired] = useState(initialIdea.user_fired ?? false)

  useEffect(() => { fetchComments() }, [])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(id, handle, display_name, avatar_url)')
      .eq('idea_id', idea.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
    setComments(data ?? [])
  }

  const toggleVote = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (voted) {
      await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', user.id)
      setVoted(false)
      setIdea((prev) => ({ ...prev, vote_count: prev.vote_count - 1 }))
    } else {
      await supabase.from('idea_votes').insert({ idea_id: idea.id, user_id: user.id })
      setVoted(true)
      setIdea((prev) => ({ ...prev, vote_count: prev.vote_count + 1 }))
    }
  }

  const toggleFire = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (fired) {
      await supabase.from('idea_fires').delete().eq('idea_id', idea.id).eq('user_id', user.id)
      setFired(false)
      setIdea((prev) => ({ ...prev, fire_count: prev.fire_count - 1 }))
    } else {
      await supabase.from('idea_fires').insert({ idea_id: idea.id, user_id: user.id })
      setFired(true)
      setIdea((prev) => ({ ...prev, fire_count: prev.fire_count + 1 }))
    }
  }

  const rateIdea = async (score: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('idea_ratings').upsert({ idea_id: idea.id, user_id: user.id, score })
    setUserRating(score)
  }

  const submitComment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !commentText.trim()) return
    await supabase.from('comments').insert({
      idea_id: idea.id,
      author_id: user.id,
      body: commentText.trim(),
    })
    setCommentText('')
    fetchComments()
  }

  const sendCollabRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('collab_requests').insert({
      idea_id: idea.id,
      requester_id: user.id,
      message: 'I would love to collaborate on this idea.',
    })
    if (error?.code === '23505') {
      Alert.alert('Already sent', 'You already sent a collab request for this idea.')
    } else {
      Alert.alert('Request sent', 'The idea owner will be notified.')
    }
  }

  const makeOffer = async (type: 'cash' | 'barter') => {
    Alert.alert(
      type === 'cash' ? 'Make an offer' : 'Propose a trade',
      type === 'cash'
        ? 'Enter your offer amount in the next screen.'
        : 'Describe what you want to trade.',
    )
  }

  const price = idea.listing?.asking_price_cents
    ? `$${(idea.listing.asking_price_cents / 100).toLocaleString()}`
    : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={ds.root} contentContainerStyle={ds.container}>

        <View style={ds.topbar}>
          <TouchableOpacity style={ds.backBtn} onPress={() => navigation.goBack()}>
            <Text style={ds.backText}>← feed</Text>
          </TouchableOpacity>
          <TouchableOpacity><Text style={{ color: '#505050', fontSize: 20 }}>⋮</Text></TouchableOpacity>
        </View>

        <View style={ds.hero}>
          <View style={ds.tagRow}>
            {[idea.category, idea.listing ? (idea.listing.listing_type === 'barter' ? 'trade' : 'sale') : null, idea.is_collab_open ? 'collab' : null]
              .filter(Boolean)
              .map((tag) => (
                <View key={tag} style={[ds.tag, { backgroundColor: TAG_BG[tag!] ?? '#1c1c1c' }]}>
                  <Text style={[ds.tagText, { color: TAG_COLOR[tag!] ?? '#888' }]}>{tag}</Text>
                </View>
              ))}
          </View>
          <Text style={ds.title}>{idea.title}</Text>
          <View style={ds.authorRow}>
            <View style={[ds.av, { backgroundColor: '#7c3aed' }]}>
              <Text style={ds.avText}>{idea.author?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={ds.handle}>@{idea.author?.handle}</Text>
              <Text style={ds.time}>{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</Text>
            </View>
          </View>
          <Text style={ds.body}>{idea.body}</Text>
        </View>

        <View style={ds.statRow}>
          {[
            { val: idea.vote_count, label: 'VOTES' },
            { val: idea.comment_count, label: 'COMMENTS' },
            { val: idea.fire_count, label: 'FIRES' },
          ].map((s) => (
            <View key={s.label} style={ds.stat}>
              <Text style={ds.statVal}>{s.val}</Text>
              <Text style={ds.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={ds.actionStrip}>
          <TouchableOpacity style={ds.actBtn} onPress={toggleVote}>
            <Text style={[ds.actText, voted && { color: '#a78bfa' }]}>↑ {idea.vote_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ds.actBtn} onPress={toggleFire}>
            <Text style={[ds.actText, fired && { color: '#f5a623' }]}>🔥 {idea.fire_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ds.actBtn, ds.shareBtn]}>
            <Text style={ds.actText}>share</Text>
          </TouchableOpacity>
        </View>

        <View style={ds.ratingBlock}>
          <Text style={ds.sectionLabel}>COMMUNITY RATING</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={ds.ratingAvg}>{idea.avg_rating > 0 ? idea.avg_rating.toFixed(1) : '—'}</Text>
            <View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => rateIdea(n)}>
                    <Text style={{ fontSize: 22, color: n <= userRating ? '#f5a623' : '#2a2a2a' }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: '#505050', fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
                {idea.rating_count} ratings
              </Text>
            </View>
          </View>
        </View>

        {idea.listing && (
          <View style={ds.pricingBlock}>
            <Text style={ds.sectionLabel}>LISTING</Text>
            {price && (
              <View style={ds.priceRow}>
                <Text style={ds.priceType}>asking price</Text>
                <Text style={ds.priceGreen}>{price}</Text>
              </View>
            )}
            {idea.listing.barter_wants?.length > 0 && (
              <View style={ds.priceRow}>
                <Text style={ds.priceType}>open to barter</Text>
                <Text style={ds.priceAmber}>{idea.listing.barter_wants.join(' · ')}</Text>
              </View>
            )}
            <View style={ds.ctaRow}>
              {price && (
                <TouchableOpacity style={ds.ctaBuy} onPress={() => makeOffer('cash')}>
                  <Text style={ds.ctaBuyText}>Make offer</Text>
                </TouchableOpacity>
              )}
              {idea.listing.barter_wants?.length > 0 && (
                <TouchableOpacity style={ds.ctaBarter} onPress={() => makeOffer('barter')}>
                  <Text style={ds.ctaBarterText}>Propose trade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {idea.is_collab_open && (
          <View style={ds.collabBlock}>
            <Text style={[ds.sectionLabel, { color: '#3ecf8e' }]}>OPEN TO COLLAB</Text>
            <View style={ds.seekRow}>
              {idea.collab_roles?.map((role) => (
                <View key={role} style={ds.seekPill}>
                  <Text style={ds.seekText}>{role}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={ds.collabBtn} onPress={sendCollabRequest}>
              <Text style={ds.collabBtnText}>Request to collaborate</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={ds.commentsBlock}>
          <Text style={ds.sectionLabel}>COMMENTS · {idea.comment_count}</Text>
          {comments.map((c) => (
            <View key={c.id} style={ds.comment}>
              <View style={[ds.av, { backgroundColor: '#185fa5', width: 28, height: 28, borderRadius: 14 }]}>
                <Text style={ds.avText}>{c.author?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ds.commentName}>@{c.author?.handle}</Text>
                <Text style={ds.commentBody}>{c.body}</Text>
                <Text style={ds.commentTime}>
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <View style={ds.commentInput}>
        <TextInput
          style={ds.commentField}
          placeholder="add a thought..."
          placeholderTextColor="#505050"
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity style={ds.sendBtn} onPress={submitComment}>
          <Text style={{ color: '#fff', fontSize: 16 }}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const TAG_BG: Record<string, string> = {
  startup: '#130f1e', creative: '#0c1a2e', sale: '#091f14', collab: '#091f14', trade: '#1c1100',
}
const TAG_COLOR: Record<string, string> = {
  startup: '#a78bfa', creative: '#60a5fa', sale: '#3ecf8e', collab: '#3ecf8e', trade: '#f5a623',
}

const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  container: { paddingBottom: 80 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  hero: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 0.5 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, color: '#efefef', lineHeight: 30, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  av: { alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 13 },
  avText: { color: '#fff', fontSize: 10, fontFamily: 'DMSans_500Medium' },
  handle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888' },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', marginTop: 1 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#888', lineHeight: 22 },
  statRow: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', gap: 8 },
  stat: { flex: 1, backgroundColor: '#1c1c1c', borderRadius: 8, padding: 10, alignItems: 'center' },
  statVal: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: '#c4a882', letterSpacing: 1 },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, color: '#505050', letterSpacing: 1, marginTop: 2 },
  actionStrip: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', gap: 4 },
  actBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8 },
  actText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  shareBtn: { marginLeft: 'auto', borderWidth: 1, borderColor: '#383838' },
  sectionLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 2, marginBottom: 10 },
  ratingBlock: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  ratingAvg: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, color: '#f5a623', letterSpacing: 1 },
  pricingBlock: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceType: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  priceGreen: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: '#3ecf8e', letterSpacing: 1 },
  priceAmber: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#f5a623' },
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ctaBuy: { flex: 1, backgroundColor: '#3ecf8e', borderRadius: 10, padding: 13, alignItems: 'center' },
  ctaBuyText: { color: '#091f14', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  ctaBarter: { flex: 1, borderWidth: 1, borderColor: '#f5a623', borderRadius: 10, padding: 13, alignItems: 'center' },
  ctaBarterText: { color: '#f5a623', fontFamily: 'DMSans_400Regular', fontSize: 14 },
  collabBlock: { padding: 14, backgroundColor: '#091f14', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  seekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  seekPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(62,207,142,.25)' },
  seekText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#3ecf8e' },
  collabBtn: { borderWidth: 1, borderColor: 'rgba(62,207,142,.4)', borderRadius: 10, padding: 12, alignItems: 'center' },
  collabBtnText: { color: '#3ecf8e', fontFamily: 'DMSans_400Regular', fontSize: 14 },
  commentsBlock: { padding: 14 },
  comment: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  commentName: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#c4a882', marginBottom: 3 },
  commentBody: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888', lineHeight: 20 },
  commentTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', marginTop: 3 },
  commentInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a', backgroundColor: '#141414',
  },
  commentField: {
    flex: 1, backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: '#efefef',
    fontSize: 13, fontFamily: 'DMSans_400Regular',
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#8a6840',
    alignItems: 'center', justifyContent: 'center',
  },
})
