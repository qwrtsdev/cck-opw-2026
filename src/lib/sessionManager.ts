import { supabase } from '@/lib/supabase'

export async function sessionManager() {
    const { data, error } = await supabase
        .from('sessions')
        .insert({})
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            const { data: existing_room, error } = await supabase
                .from('sessions')
                .select()
                .in('status', ['waiting', 'playing'])
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()

            if (error) throw error

            return existing_room
        }
        throw error
    }

    return data
}