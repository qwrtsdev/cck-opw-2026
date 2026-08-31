export type Session = {
    id: string
    status?: string
    player_id?: string
    created_at?: string;
    profiles?: { display_name: string } | null;
}

export type PlayerItem = {
    id?: string
    name: string
    score: number | string
    isPlaceholder?: boolean
}

export type Profile = {
    id: string;
    display_name: string;
};