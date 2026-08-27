import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useAuth() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function ensureSignedIn() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                await supabase.auth.signInAnonymously()
            } else {
                setUser(session.user)
            }
            setLoading(false)
        }
        ensureSignedIn()

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null)
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    return { user, loading }
}