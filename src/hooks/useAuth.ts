import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Player = {
    id: string
    name: string
    score: number
    isPlaceholder?: boolean
}

export function useAuth() {
    const [player, setPlayer] = useState<Player | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function fetchOrCreateProfile(userId: string): Promise<string> {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('display_name')
                    .eq('id', userId)
                    .maybeSingle()

                if (error) {
                    console.warn('Error fetching profile in useAuth:', error)
                }

                if (data?.display_name) {
                    return data.display_name
                }

                // If profile does not exist yet, create default profile row
                const defaultName = 'Anonymous'
                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({ id: userId, display_name: defaultName })

                if (upsertError) {
                    console.warn('Could not upsert default profile in useAuth:', upsertError)
                }
                return defaultName
            } catch (err) {
                console.warn('fetchOrCreateProfile error:', err)
                return 'Anonymous'
            }
        }

        async function initAuth() {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                let currentSession = session
                if (!currentSession) {
                    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
                    if (signInError) {
                        console.error('Error signing in anonymously:', signInError)
                    } else {
                        currentSession = signInData.session
                    }
                }

                if (currentSession?.user) {
                    const displayName = await fetchOrCreateProfile(currentSession.user.id)
                    if (mounted) {
                        setPlayer({
                            id: currentSession.user.id,
                            name: displayName,
                            score: 0,
                        })
                    }
                }
            } catch (e) {
                console.error('initAuth error:', e)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initAuth()

        const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
            if (!session?.user) {
                if (mounted) {
                    setPlayer(null)
                    setLoading(false)
                }
                return
            }

            const displayName = await fetchOrCreateProfile(session.user.id)
            if (mounted) {
                setPlayer({
                    id: session.user.id,
                    name: displayName,
                    score: 0,
                })
                setLoading(false)
            }
        })

        return () => {
            mounted = false
            sub.subscription.unsubscribe()
        }
    }, [])

    return { player, loading }
}