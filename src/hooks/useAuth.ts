import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function ensureSignedIn() {
            try {
                // Check if Supabase is configured
                if (!supabase || !supabase.auth) {
                    console.warn("Supabase auth not available, running in offline mode")
                    setLoading(false)
                    return
                }

                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    const { error } = await supabase.auth.signInAnonymously()
                    if (error) {
                        console.warn("Anonymous sign-in failed:", error.message)
                    }
                } else {
                    setUser(session.user)
                }
            } catch (err) {
                console.warn("Auth initialization failed:", err instanceof Error ? err.message : String(err))
            } finally {
                setLoading(false)
            }
        }
        ensureSignedIn()

        // Only set up listener if Supabase is available
        if (supabase && supabase.auth) {
            const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
                setUser(session?.user ?? null)
            })
            return () => sub.subscription.unsubscribe()
        }
    }, [])

    return { user, loading }
}