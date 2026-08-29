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

        async function ensureSignedIn() {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                await supabase.auth.signInAnonymously()
            } else {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('display_name')
                    .eq('id', session.user.id)
                    .single()

                if (mounted) {
                    setPlayer({
                        id: session.user.id,
                        name: profile?.display_name ?? 'Anonymous',
                        score: 0,
                    })
                }
            }

            if (mounted) setLoading(false)
        }

        ensureSignedIn()

        const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
            if (!session?.user) {
                if (mounted) setPlayer(null)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', session.user.id)
                .single()

            if (mounted) {
                setPlayer({
                    id: session.user.id,
                    name: profile?.display_name ?? 'Anonymous',
                    score: 0,
                })
            }
        })

        return () => {
            mounted = false
            sub.subscription.unsubscribe()
        }
    }, [])

    return { player, loading }
}