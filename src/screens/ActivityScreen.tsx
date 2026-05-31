import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native'
import { supabase, Notification } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

const NOTIF_META: Record<string, { icon: string; label: string; color: string }> = {
  vote:           { icon: '↑', label: 'voted on your idea', color: '#a78bfa' },
  fire:           { icon: '🔥', label: 'fired your idea', color: '#f5a623' },
  comment:        { icon: '💬', label: 'commented on your idea', color: '#60a5fa' },
  reply:          { icon: '↩', label: 'replied to your comment', color: '#60a5fa' },
  collab_request: { icon: '⊕', label: 'wants to collaborate', color: '#3ecf8e' },
  offer_received: { icon: '◇', label: 'made you an offer', color: '#3ecf8e' },
  offer_accepted: { icon: '✓', label: 'accepted your offer', color: '#3ecf8e' },
  trade_agreed:   { icon: '⇌', label: 'trade agreed', color: '#c4a882' },
  group_invite:   { icon: '⊕', label: 'invited you to a group', color: '#a78bfa' },
  group_activity: { icon: '◈', label: 'new activity in your group', color: '#888' },
}

function NotifItem({ notif, onPress }: { notif: Notification; onPress: () => void }) {
  const meta = NOTIF_META[notif.type] ?? { icon: '·', label: notif.type, color: '#888' }

  return (
    <TouchableOpacity
      style={[ns.item, !notif.is_read && ns.itemUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[ns.iconWrap, { backgroundColor: meta.color + '18' }]}>
        <Text style={[ns.icon, { color: meta.color }]}>{meta.icon}</Text>
      </View>
      <View style={ns.body}>
        <Text style={ns.text}>
          <Text style={ns.actor}>@{notif.actor?.handle} </Text>
          <Text style={ns.label}>{meta.label}</Text>
        </Text>
        {notif.idea?.title ? (
          <Text style={ns.ideaTitle} numberOfLines={1}>"{notif.idea.title}"</Text>
        ) : null}
        <Text style={ns.time}>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</Text>
      </View>
      {!notif.is_read && <View style={ns.unreadDot} />}
    </TouchableOpacity>
  )
}

export default function ActivityScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(id, handle, display_name),
        idea:ideas(title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)

    setNotifications((data as Notification[]) ?? [])
    setUnreadCount((data ?? []).filter((n: any) => !n.is_read).length)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const markRead = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (notif.idea_id) {
      navigation.navigate('Feed')
    }
  }

  return (
    <View style={ns.root}>
      <View style={ns.topbar}>
        <View>
          <Text style={ns.wordmark}>ACTIVITY</Text>
          <Text style={ns.wordmarkSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : "you're all caught up"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={ns.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(i) => i.id}
        contentContainerStyle={ns.feedList}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} tintColor="#c4a882" />}
        ListEmptyComponent={
          !loading ? (
            <View style={ns.empty}>
              <Text style={ns.emptyText}>Nothing yet.</Text>
              <Text style={ns.emptySub}>Activity from votes, comments, offers, and collabs will show up here.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <NotifItem notif={item} onPress={() => markRead(item)} />
        )}
      />
    </View>
  )
}

const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#c4a882', letterSpacing: 2 },
  wordmarkSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 2, marginTop: 2 },
  markAllText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8a6840' },
  feedList: { paddingBottom: 80 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#1c1c1c',
  },
  itemUnread: { backgroundColor: '#141410' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  icon: { fontSize: 16 },
  body: { flex: 1 },
  text: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#888', lineHeight: 20 },
  actor: { color: '#c4a882' },
  label: { color: '#888' },
  ideaTitle: { fontFamily: 'PlayfairDisplay_400Regular_Italic', fontSize: 12, color: '#505050', marginTop: 2 },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#383838', marginTop: 4 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c4a882', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 18, color: '#505050', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#383838', textAlign: 'center', paddingHorizontal: 40 },
})
