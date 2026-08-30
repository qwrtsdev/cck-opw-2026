import { Marquee } from "@/components/ui/marquee"
import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { useNavigate } from "react-router"
import { supabase } from "../lib/supabaseClient"

import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { Loader2, Play, Smartphone } from 'lucide-react'

import ccklogo from "@/assets/cck-logo.png"
import place_1 from "../assets/place-1.png"
import place_2 from "../assets/place-2.png"
import place_3 from "../assets/place-3.png"

const placeImages = [place_1, place_2, place_3]
const PLACE_COUNT = 5

const rankStyles = [
  "bg-yellow-400/10 border border-yellow-400/40",
  "bg-gray-300/10 border border-gray-300/30",
  "bg-orange-400/10 border border-orange-400/30",
]

type Player = {
  id?: string
  name: string
  score: number | string
  isPlaceholder?: boolean
}

function padPlayers(players: Player[]): Player[] {
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
  const navigate = useNavigate()
  const [qr, setQr] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [qrLoading, setQrLoading] = useState(true)
  const [scoreLoading, setScoreLoading] = useState(true)

  useEffect(() => {
    generateId()
    getLeaderboard()
  }, [])

  async function generateId() {
    const uuid = await crypto.randomUUID();
    const url = `${window.location.origin}/play?id=${uuid}`;

    setQr(url)
    setQrLoading(false)
  }

  async function getLeaderboard() {
    try {
      // Check if Supabase is properly configured
      if (!supabase || !supabase.from) {
        console.warn("Supabase not properly configured, skipping leaderboard")
        setScoreLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('score', { ascending: false })
        .limit(5)

      if (error) {
        console.warn("Supabase Error (leaderboard will show empty):", error.message)
        setScoreLoading(false)
        return
      }

      setPlayers(data || [])
    } catch (err) {
      console.warn("Failed to load leaderboard:", err instanceof Error ? err.message : String(err))
    } finally {
      setScoreLoading(false)
    }
  }

  const displayedPlayers = padPlayers(scoreLoading ? [] : players)

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
                      <img src={placeImages[idx]} className="w-8 h-8 shrink-0" alt={`place ${idx + 1}`} />
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