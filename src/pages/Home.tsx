import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import QRCode from "react-qr-code"

import { supabase } from "@/lib/supabase"
import { sessionManager } from "@/lib/sessionManager"

import type { Session, PlayerItem } from "@/types/game"

import { Marquee } from "@/components/ui/marquee"
import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { Loader2, Play, Smartphone } from 'lucide-react'

import ccklogo from "@/assets/cck-logo.png"
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

function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [leaderboard, setLeaderboard] = useState<PlayerItem[]>([])
  const [scoreLoading, setScoreLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    sessionManager()
      .then(setSession)

    getLeaderboard()
  }, [])

  useEffect(() => {
    if (!session?.id) return

    if (session.status === 'playing') {
      navigate(`/game?id=${session.id}`)
      return
    }

    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload: { new: Session }) => { if (payload.new.status === 'playing') navigate(`/game?id=${session.id}`) }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return

    const timer = setTimeout(async () => {
      await supabase.rpc('expire_session', { p_session_id: session.id })

      const new_session = await sessionManager()
      setSession(new_session)

      if (new_session.status === 'playing') {
        navigate(`/game?id=${new_session.id}`)
      }
    }, 10 * 60 * 1000)

    return () => clearTimeout(timer)
  }, [session?.id])

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

  const qrLoading = !session
  const qr = session ? `${window.location.origin}/control?id=${session.id}` : ''
  const displayedPlayers = padPlayers(scoreLoading ? [] : leaderboard)

  return (
    <div className="bg-neutral-900 select-none relative w-screen h-screen flex flex-row">
      {/* QR + background */}
      <div className="w-1/2 h-full relative">
        <div className="absolute inset-0 z-0">
          <GlyphMatrix cellSize={40} />
        </div>

        <div className="text-white relative z-10 flex flex-col justify-between items-center h-full w-full">
          <Marquee repeat={4} className="w-full text-white font-pixel text-8xl shrink-0 flex flex-row justify-center items-center">
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
          </Marquee>

          <div className="flex flex-col gap-12 justify-center items-center">
            <div className="h-auto m-0 min-w-20 w-130 border-white border-8">
              {qrLoading ?
                (
                  <div className="w-full aspect-square bg-white flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-neutral-900 animate-spin" />
                  </div>
                )
                : (<QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={qr}
                  viewBox={`0 0 256 256`}
                />)}
            </div>
            <p className="text-2xl"><Smartphone className="inline mr-3" />แสกนเพื่อเล่นเกม</p>

            {/* Direct game access button for testing */}
            <button
              onClick={() => navigate('/game')}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors"
            >
              <Play className="w-5 h-5" />
              เข้าเกมโดยตรง (Test)
            </button>
          </div>

          <Marquee repeat={4} reverse={true} className="w-full text-white font-pixel text-8xl shrink-0 flex flex-row justify-center items-center">
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
            <span>COMPUTER CLUB KMUTNB</span>
            <span className="inline-flex items-center"><img src={ccklogo} className="w-10" /></span>
          </Marquee>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="w-1/2 h-full bg-neutral-950 flex items-center justify-center">
        <div className="text-white flex flex-col gap-2 justify-center items-center font-pixel">
          <h1 className="font-thai text-6xl font-semibold mb-8">อันดับผู้เล่น</h1>
          <div>
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
                      <p className="w-7 text-center text-gray-400 font-semibold shrink-0">{idx + 1}</p>
                    )}
                    <p className="font-medium truncate">{player.name}</p>
                  </span>
                  <p className="text-5xl font-bold tabular-nums min-w-[4ch] text-right shrink-0">{player.score}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home