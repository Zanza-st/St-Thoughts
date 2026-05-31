import { useState, useEffect, useCallback } from 'react'
import { supabase, Idea } from '../lib/supabase'

type Filter = {
  category?: string
  is_collab_open?: boolean
  has_listing?: boolean
  group_id?: string | null
  sort?: 'top' | 'new' | 'active'
}

export function useIdeas(filter: Filter = {}) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIdeas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('ideas')
        .select(`
          *,
          author:profiles(id, handle, display_name, avatar_url),
          listing:listings(*)
        `)

      if (filter.group_id !== undefined) {
        query = query.eq('group_id', filter.group_id)
      } else {
        query = query.is('group_id', null)
      }

      if (filter.category) query = query.eq('category', filter.category)
      if (filter.is_collab_open) query = query.eq('is_collab_open', true)

      if (filter.sort === 'top' || !filter.sort) {
        query = query.order('vote_count', { ascending: false })
      } else if (filter.sort === 'new') {
        query = query.order('created_at', { ascending: false })
      } else if (filter.sort === 'active') {
        query = query.order('comment_count', { ascending: false })
      }

      const { data, error: fetchError } = await query.limit(50)
      if (fetchError) throw fetchError

      // Attach user reaction state
      if (user && data) {
        const ideaIds = data.map((i) => i.id)

        const [{ data: votes }, { data: fires }, { data: ratings }] = await Promise.all([
          supabase.from('idea_votes').select('idea_id').eq('user_id', user.id).in('idea_id', ideaIds),
          supabase.from('idea_fires').select('idea_id').eq('user_id', user.id).in('idea_id', ideaIds),
          supabase.from('idea_ratings').select('idea_id, score').eq('user_id', user.id).in('idea_id', ideaIds),
        ])

        const votedSet = new Set(votes?.map((v) => v.idea_id))
        const firedSet = new Set(fires?.map((f) => f.idea_id))
        const ratingMap = new Map(ratings?.map((r) => [r.idea_id, r.score]))

        setIdeas(data.map((idea) => ({
          ...idea,
          user_voted: votedSet.has(idea.id),
          user_fired: firedSet.has(idea.id),
          user_rated: ratingMap.get(idea.id),
        })))
      } else {
        setIdeas(data ?? [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filter)])

  useEffect(() => {
    fetchIdeas()

    // Real-time subscription
    const channel = supabase
      .channel('ideas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, fetchIdeas)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchIdeas])

  const toggleVote = async (ideaId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const idea = ideas.find((i) => i.id === ideaId)
    if (!idea) return

    if (idea.user_voted) {
      await supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('user_id', user.id)
    } else {
      await supabase.from('idea_votes').insert({ idea_id: ideaId, user_id: user.id })
    }

    setIdeas((prev) => prev.map((i) =>
      i.id === ideaId
        ? { ...i, user_voted: !i.user_voted, vote_count: i.vote_count + (i.user_voted ? -1 : 1) }
        : i
    ))
  }

  const toggleFire = async (ideaId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const idea = ideas.find((i) => i.id === ideaId)
    if (!idea) return

    if (idea.user_fired) {
      await supabase.from('idea_fires').delete().eq('idea_id', ideaId).eq('user_id', user.id)
    } else {
      await supabase.from('idea_fires').insert({ idea_id: ideaId, user_id: user.id })
    }

    setIdeas((prev) => prev.map((i) =>
      i.id === ideaId
        ? { ...i, user_fired: !i.user_fired, fire_count: i.fire_count + (i.user_fired ? -1 : 1) }
        : i
    ))
  }

  const rateIdea = async (ideaId: string, score: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('idea_ratings').upsert({ idea_id: ideaId, user_id: user.id, score })
    setIdeas((prev) => prev.map((i) => i.id === ideaId ? { ...i, user_rated: score } : i))
  }

  return { ideas, loading, error, refresh: fetchIdeas, toggleVote, toggleFire, rateIdea }
}
