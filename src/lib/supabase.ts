import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Profile = {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: 'idea_person' | 'builder' | 'investor' | 'collaborator'
  is_pro: boolean
  total_votes_received: number
  total_ideas_posted: number
  created_at: string
}

export type Idea = {
  id: string
  author_id: string
  title: string
  body: string
  category: string
  is_collab_open: boolean
  collab_roles: string[]
  vote_count: number
  fire_count: number
  comment_count: number
  avg_rating: number
  rating_count: number
  group_id: string | null
  created_at: string
  author?: Profile
  listing?: Listing
  user_voted?: boolean
  user_fired?: boolean
  user_rated?: number
}

export type Listing = {
  id: string
  idea_id: string
  seller_id: string
  listing_type: 'sale' | 'barter' | 'both'
  asking_price_cents: number | null
  barter_wants: string[]
  status: 'active' | 'under_offer' | 'sold' | 'closed'
  created_at: string
}

export type Comment = {
  id: string
  idea_id: string
  author_id: string
  parent_id: string | null
  body: string
  created_at: string
  author?: Profile
}

export type Notification = {
  id: string
  user_id: string
  type: string
  actor_id: string
  idea_id: string | null
  message: string | null
  is_read: boolean
  created_at: string
  actor?: Profile
  idea?: { title: string }
}

export type Group = {
  id: string
  name: string
  description: string | null
  color: string
  created_by: string
  is_invite_only: boolean
  member_count: number
  created_at: string
  user_role?: 'owner' | 'admin' | 'member'
}
