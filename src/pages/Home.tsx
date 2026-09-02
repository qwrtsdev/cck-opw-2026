// Home.tsx

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import QRCode from "react-qr-code"

import { supabase } from "@/lib/supabase"

import type { Session, PlayerItem } from "@/types/game"

import { Marquee } from "@/components/ui/marquee"
import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { Play, Smartphone, LoaderCircle } from 'lucide-react'

import ccklogo from "@/assets/cck-logo.png"
import gameLogo from "@/assets/cascade_failure_logo.png"
import place_1 from "@/assets/place-1.png"
import place_2 from "@/assets/place-2.png"
import place_3 from "@/assets/place-3.png"

const badgeImages = [place_1, place_2, place_3]
const PLACE_COUNT = 5

const rankStyles = [
  "bg-yellow-400/10 border border-yellow-400/40",
  "bg-gray-300/10 border border-gray-300/30",
  "bg-orange-400/10 border border-orange-400/30",
]

type ScoreRow = {
  player_name: string
  score: number | string
}

function padPlayers(players: PlayerItem[]): PlayerItem[] {
  return Array.from({ length: PLACE_COUNT }, (_, idx) =>
    players[idx] ?? {
      id: `placeholder-${idx}`,
      name: "----",
      score: "0000",
      isPlaceholder: false,
    }
  )
}

// Latest session currently sitting in "waiting" — i.e. the one Admin.tsx
// just created and hasn't been claimed by a controller yet. This is the
// only thing Home.tsx needs to know to draw the QR; it never creates or
// expires sessions itself anymore, that's entirely Admin's job now.
async function fetchWaitingSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Supabase Error:", error)
    return null
  }

  return data as Session | null
}

function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [leaderboard, setLeaderboard] = useState<PlayerItem[]>([])
  const [scoreLoading, setScoreLoading] = useState(true)
  const navigate = useNavigate()

  // Mirrors `session?.id` for the realtime handler below, which needs the
  // current id without re-subscribing every time session changes.
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    getLeaderboard()
  }, [])

  // Single source of truth for "what room is on screen": fetch the current
  // waiting session once, then keep it live via realtime instead of ever
  // generating/expiring one ourselves.
  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      const waiting = await fetchWaitingSession()
      if (cancelled) return
      setSession(waiting)
      sessionIdRef.current = waiting?.id ?? null
      setInitializing(false)
    }

    loadInitial()

    const channel = supabase
      .channel('home-waiting-session')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        async (payload) => {
          const changed = (payload.new ?? payload.old) as Partial<Session> | undefined
          const newStatus = (payload.new as Session | undefined)?.status

          // The session currently on screen just got claimed by a
          // controller — jump straight into the game rather than waiting
          // on a refetch to notice.
          if (changed?.id && changed.id === sessionIdRef.current && newStatus === 'playing') {
            navigate(`/game?id=${changed.id}`)
            return
          }

          // Anything else (new session created, session ended, etc.) —
          // just re-resolve who the current waiting session is.
          const waiting = await fetchWaitingSession()
          if (cancelled) return
          setSession(waiting)
          sessionIdRef.current = waiting?.id ?? null
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [navigate])

  async function getLeaderboard() {
    const { data, error } = await supabase
      .from('scores')
      .select('player_name, score')
      .order('score', { ascending: false })
      .limit(5)

    if (error) {
      console.error("Supabase Error:", error)
      setScoreLoading(false)
    }

    setLeaderboard(((data || []) as ScoreRow[]).map((row) => ({
      name: row.player_name,
      score: row.score,
    })))

    setScoreLoading(false)
  }

  // "Room ready" = we've finished the initial check AND there's currently
  // a waiting session to show. Both the initial fetch and the "nothing
  // waiting right now" case render the same fallback box, since from the
  // viewer's side there's nothing to scan either way.
  const roomReady = !initializing && session?.status === 'waiting'
  const qr = roomReady ? `${window.location.origin}/control?id=${session!.id}` : ''
  const displayedPlayers = padPlayers(scoreLoading ? [] : leaderboard)

  return (
    <div className="bg-neutral-950 select-none relative w-screen h-screen flex flex-row overflow-hidden">
      {/* QR + background */}
      <div className="w-1/2 h-full relative flex flex-col">
        <div className="absolute inset-0 z-0">
          <GlyphMatrix cellSize={40} />
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-neutral-950/70 via-transparent to-neutral-950/80" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full text-white gap-10">
          <div className="relative p-6">
            {/* bracket-frame, like a viewfinder */}
            <span className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-[#fafafa] rounded-tl-lg" />
            <span className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-[#fafafa] rounded-tr-lg" />
            <span className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-[#fafafa] rounded-bl-lg" />
            <span className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-[#fafafa] rounded-br-lg" />

            <div className="h-auto w-xl bg-white p-4 rounded-md">
              {roomReady ? (
                <QRCode
                  size={320}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={qr}
                  viewBox={`0 0 320 320`}
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <LoaderCircle color="#0a0a0a" className="animate-spin w-20 h-auto" />
                </div>
              )}
            </div>
          </div>

          <p className="font-thai text-3xl text-neutral-200 flex items-center gap-3">
            <Smartphone className="w-7 h-7 text-[#fafafa]" />
            แสกนเพื่อเล่นเกม
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="w-1/2 h-full bg-neutral-950 relative flex flex-col items-center justify-center gap-8 border-l border-white/10">
        <img
          src={gameLogo}
          alt="Cascade Failure Logo"
          className="w-xl h-auto drop-shadow-[0_0_40px_rgba(255,178,0,0.15)]"
        />

        <p className="text-white text-2xl underline">อันดับผู้เล่น</p>

        <div className="text-white flex flex-col gap-2 items-center font-pixel">
          <ul className="flex flex-col gap-3 w-120 mx-auto">
            {displayedPlayers.map((player, idx) => (
              <li
                key={player.id || player.name || idx}
                className={`flex items-center gap-12 rounded-2xl px-5 py-3 ${rankStyles[idx] ?? "bg-white/5 border border-white/10"
                  } ${player.isPlaceholder ? "opacity-40" : ""}`}
              >
                <span className="flex items-center gap-3 text-5xl flex-1 min-w-0 overflow-hidden">
                  {idx < 3 && !player.isPlaceholder ? (
                    <img src={badgeImages[idx]} className="w-8 h-8 shrink-0" alt={`place ${idx + 1}`} />
                  ) : (
                    <p className="w-7 text-center text-neutral-500 font-semibold shrink-0">{idx + 1}</p>
                  )}
                  <p className="font-medium truncate">{player.name}</p>
                </span>
                <p className="text-5xl font-bold tabular-nums min-w-[4ch] text-right shrink-0 text-[#fafafa]">
                  {player.score}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Home