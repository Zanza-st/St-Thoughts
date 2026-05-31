import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native'
import { supabase, Listing, Idea, Profile } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

type MarketItem = Listing & {
  idea: Idea & { author: Profile }
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'For sale' },
  { key: 'barter', label: 'Trade / Barter' },
  { key: 'my_offers', label: 'My offers' },
]

function ListingCard({ item, onPress }: { item: MarketItem; onPress: () => void }) {
  const price = item.asking_price_cents
    ? `$${(item.asking_price_cents / 100).toLocaleString()}`
    : null

  return (
    <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cs.eyebrow}>
        <View style={[cs.badge, item.listing_type === 'barter' ? cs.badgeTrade : cs.badgeSale]}>
          <Text style={[cs.badgeText, item.listing_type === 'barter' ? cs.badgeTextTrade : cs.badgeTextSale]}>
            {item.listing_type === 'barter' ? 'TRADE' : item.listing_type === 'both' ? 'SALE · TRADE' : 'SALE'}
          </Text>
        </View>
        <Text style={cs.time}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>

      <Text style={cs.title}>{item.idea?.title}</Text>
      <Text style={cs.body} numberOfLines={2}>{item.idea?.body}</Text>

      <View style={cs.authorRow}>
        <View style={[cs.av, { backgroundColor: '#7c3aed' }]}>
          <Text style={cs.avText}>{item.idea?.author?.handle?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={cs.handle}>@{item.idea?.author?.handle}</Text>
      </View>

      <View style={cs.pricingRow}>
        {price && <Text style={cs.priceGreen}>{price}</Text>}
        {price && item.barter_wants?.length > 0 && <Text style={cs.sep}>·</Text>}
        {item.barter_wants?.length > 0 && (
          <Text style={cs.priceAmber} numberOfLines={1}>
            open to: {item.barter_wants.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

function OfferModal({
  visible, listing, onClose,
}: {
  visible: boolean
  listing: MarketItem | null
  onClose: () => void
}) {
  const [offerType, setOfferType] = useState<'cash' | 'barter'>('cash')
  const [amount, setAmount] = useState('')
  const [barterDesc, setBarterDesc] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!listing) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (offerType === 'cash' && !amount) {
      Alert.alert('Enter an amount')
      return
    }
    if (offerType === 'barter' && !barterDesc) {
      Alert.alert('Describe what you are offering')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('offers').insert({
      listing_id: listing.id,
      buyer_id: user.id,
      offer_type: offerType,
      offer_amount_cents: offerType === 'cash' ? Math.round(parseFloat(amount) * 100) : null,
      barter_description: offerType === 'barter' ? barterDesc : null,
      message,
    })
    setLoading(false)

    if (error?.code === '23505') {
      Alert.alert('Already offered', 'You already have an active offer on this listing.')
    } else if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Offer sent!', 'The seller will be notified.')
      setAmount('')
      setBarterDesc('')
      setMessage('')
      onClose()
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={ms.modal} contentContainerStyle={ms.modalContent} keyboardShouldPersistTaps="handled">
          <View style={ms.modalHeader}>
            <Text style={ms.modalTitle}>Make an offer</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {listing && (
            <View style={ms.ideaRef}>
              <Text style={ms.ideaRefTitle} numberOfLines={2}>{listing.idea?.title}</Text>
              <Text style={ms.ideaRefHandle}>@{listing.idea?.author?.handle}</Text>
            </View>
          )}

          <View style={ms.offerTypeTabs}>
            {(['cash', 'barter'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[ms.offerTab, offerType === t && ms.offerTabOn]}
                onPress={() => setOfferType(t)}
              >
                <Text style={[ms.offerTabText, offerType === t && ms.offerTabTextOn]}>
                  {t === 'cash' ? 'Cash offer' : 'Barter / Trade'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {offerType === 'cash' ? (
            <TextInput
              style={ms.input}
              placeholder="offer amount (USD)"
              placeholderTextColor="#505050"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          ) : (
            <TextInput
              style={[ms.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="what are you offering in exchange?"
              placeholderTextColor="#505050"
              value={barterDesc}
              onChangeText={setBarterDesc}
              multiline
            />
          )}

          <TextInput
            style={[ms.input, { minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="message to seller (optional)"
            placeholderTextColor="#505050"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity style={ms.submitBtn} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={ms.submitBtnText}>Send offer</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function MarketScreen() {
  const [listings, setListings] = useState<MarketItem[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedListing, setSelectedListing] = useState<MarketItem | null>(null)
  const [offerModalVisible, setOfferModalVisible] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select(`
        *,
        idea:ideas(*, author:profiles(id, handle, display_name, avatar_url))
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (activeFilter === 'sale') query = query.in('listing_type', ['sale', 'both'])
    if (activeFilter === 'barter') query = query.in('listing_type', ['barter', 'both'])

    const { data, error } = await query.limit(40)
    if (!error) setListings((data as MarketItem[]) ?? [])
    setLoading(false)
  }, [activeFilter])

  const fetchMyOffers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('offers')
      .select(`*, listing:listings(*, idea:ideas(title, author:profiles(handle)))`)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
    setMyOffers(data ?? [])
  }, [])

  useEffect(() => {
    if (activeFilter === 'my_offers') {
      fetchMyOffers()
    } else {
      fetchListings()
    }
  }, [activeFilter, fetchListings, fetchMyOffers])

  const openOffer = (item: MarketItem) => {
    setSelectedListing(item)
    setOfferModalVisible(true)
  }

  return (
    <View style={ms.root}>
      <View style={ms.topbar}>
        <View>
          <Text style={ms.wordmark}>MARKET</Text>
          <Text style={ms.wordmarkSub}>ideas · trades · barter</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ms.filterStrip}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ms.fpill, activeFilter === item.key && ms.fpillOn]}
            onPress={() => setActiveFilter(item.key)}
          >
            <Text style={[ms.fpillText, activeFilter === item.key && ms.fpillTextOn]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {activeFilter === 'my_offers' ? (
        <FlatList
          data={myOffers}
          keyExtractor={(i) => i.id}
          contentContainerStyle={ms.feedList}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyOffers} tintColor="#c4a882" />}
          ListEmptyComponent={
            <View style={ms.empty}>
              <Text style={ms.emptyText}>No offers yet.</Text>
              <Text style={ms.emptySub}>Browse listings and make your first offer.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={ms.offerCard}>
              <View style={ms.offerHeader}>
                <Text style={[ms.offerStatus, { color: STATUS_COLOR[item.status] ?? '#888' }]}>
                  {item.status.toUpperCase()}
                </Text>
                <Text style={ms.offerTime}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
              </View>
              <Text style={ms.offerIdeaTitle} numberOfLines={1}>{item.listing?.idea?.title}</Text>
              <Text style={ms.offerMeta}>
                {item.offer_type === 'cash'
                  ? `$${((item.offer_amount_cents ?? 0) / 100).toLocaleString()}`
                  : item.barter_description}
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(i) => i.id}
          contentContainerStyle={ms.feedList}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchListings} tintColor="#c4a882" />}
          ListEmptyComponent={
            !loading ? (
              <View style={ms.empty}>
                <Text style={ms.emptyText}>No listings yet.</Text>
                <Text style={ms.emptySub}>Ideas listed for sale or trade will appear here.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard item={item} onPress={() => openOffer(item)} />
          )}
        />
      )}

      <OfferModal
        visible={offerModalVisible}
        listing={selectedListing}
        onClose={() => setOfferModalVisible(false)}
      />
    </View>
  )
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#c4a882',
  accepted: '#3ecf8e',
  declined: '#ef4444',
  withdrawn: '#505050',
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeSale: { backgroundColor: '#091f14' },
  badgeTrade: { backgroundColor: '#1c1100' },
  badgeText: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 0.5 },
  badgeTextSale: { color: '#3ecf8e' },
  badgeTextTrade: { color: '#f5a623' },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#505050' },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: '#efefef', lineHeight: 22, marginBottom: 6 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#888', lineHeight: 18, marginBottom: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  av: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avText: { color: '#fff', fontSize: 9, fontFamily: 'DMSans_500Medium' },
  handle: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#888' },
  pricingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  priceGreen: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: '#3ecf8e', letterSpacing: 1 },
  priceAmber: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#f5a623', flex: 1 },
  sep: { color: '#2a2a2a' },
})

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0c' },
  topbar: {
    padding: 16, paddingTop: 52,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  wordmark: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#c4a882', letterSpacing: 2 },
  wordmarkSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050', letterSpacing: 3, marginTop: 2 },
  filterStrip: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  fpill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#383838', marginRight: 6 },
  fpillOn: { borderColor: '#8a6840', backgroundColor: '#1a1410' },
  fpillText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#505050' },
  fpillTextOn: { color: '#c4a882' },
  feedList: { padding: 14, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 18, color: '#505050', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#383838', textAlign: 'center' },
  offerCard: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  offerStatus: { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 1 },
  offerTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#505050' },
  offerIdeaTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: '#efefef', marginBottom: 4 },
  offerMeta: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#c4a882' },
  modal: { flex: 1, backgroundColor: '#0c0c0c' },
  modalContent: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#efefef' },
  ideaRef: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 12, marginBottom: 16 },
  ideaRefTitle: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 15, color: '#efefef', marginBottom: 4 },
  ideaRefHandle: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#888' },
  offerTypeTabs: { flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, overflow: 'hidden' },
  offerTab: { flex: 1, padding: 11, alignItems: 'center' },
  offerTabOn: { backgroundColor: '#1a1410' },
  offerTabText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#505050' },
  offerTabTextOn: { color: '#c4a882' },
  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#efefef', fontSize: 14,
    fontFamily: 'DMSans_400Regular', marginBottom: 10,
  },
  submitBtn: { backgroundColor: '#8a6840', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans_500Medium' },
})
