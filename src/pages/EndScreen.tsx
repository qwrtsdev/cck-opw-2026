import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { supabase } from "@/lib/supabase"
import { Loader2 } from 'lucide-react'
import ccklogo from "@/assets/cck-logo.png"
import gameLogo from "@/assets/cascade_failure_logo.png"
import iglogo from "@/assets/instagram.png"

function pad(num: number, size = 4) {
  return String(num).padStart(size, '0')
}

function ConfettiCanvas({ play }: { play: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const particles: any[] = []
    const colors = ['#ff6b6b', '#ffd93d', '#6bffb3', '#6bd0ff', '#d06bff']

    function spawn() {
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: w / 2 + (Math.random() - 0.5) * 200,
          y: h / 2 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * -10 - 2,
          r: 6 + Math.random() * 6,
          c: colors[(Math.random() * colors.length) | 0],
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.3,
          life: 60 + Math.random() * 40,
        })
      }
    }

    let raf = 0
    let frames = 0

    function step() {
      frames++
      ctx.clearRect(0, 0, w, h)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += 0.35
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotV
        p.life--
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r)
        ctx.restore()
        if (p.life <= 0 || p.y > h + 50) particles.splice(i, 1)
      }
      if (frames < 200 && play) {
        raf = requestAnimationFrame(step)
      }
    }

    function onResize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }

    if (play) {
      spawn()
      raf = requestAnimationFrame(step)
      window.addEventListener('resize', onResize)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [play])

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-40" />
}

// The result card, shared markup used both on-screen and in the offscreen export node.
// Keeping this as one component guarantees what you see is what gets shared.
function ResultCard({
  score,
  playerName,
  createdAt,
  fixedSize,
}: {
  score: number
  playerName: string
  createdAt: string
  fixedSize?: boolean
}) {
  return (
    <div
      className={
        fixedSize
          ? "bg-neutral-950 border border-neutral-800 rounded-[48px] flex flex-col items-center justify-center gap-10 font-thai text-white"
          : "bg-neutral-950 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center gap-6 font-thai w-full max-w-md text-white"
      }
      style={fixedSize ? { width: 1080, height: 1920, padding: 96 } : undefined}
    >
      <p className={fixedSize ? "text-neutral-400 text-3xl" : "text-neutral-400 text-sm"}>
        คะแนนทั้งหมด
      </p>
      <h1
        className={
          fixedSize
            ? "font-bold tabular-nums tracking-tight"
            : "text-6xl font-bold tabular-nums tracking-tight"
        }
        style={fixedSize ? { fontSize: 220, lineHeight: 1 } : undefined}
      >
        {pad(score)}
      </h1>
      <p className={fixedSize ? "text-5xl truncate" : "text-xl truncate"}>
        {playerName}
      </p>
      <p className={fixedSize ? "text-2xl text-neutral-500 mt-4" : "text-sm text-neutral-500"}>
        {createdAt}
      </p>
    </div>
  )
}

function EndScreen() {
  const [params] = useSearchParams()
  const id = params.get('id')

  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState<boolean | null>(null)
  const [playerName, setPlayerName] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string>('')

  const [displayScore, setDisplayScore] = useState(0)
  const [playConfetti, setPlayConfetti] = useState(false)

  useEffect(() => {
    if (!id) {
      setExists(false)
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('scores')
        .select('player_name, score, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('scores query failed:', error)
        setExists(false)
        setLoading(false)
        return
      }
      if (!data) {
        setExists(false)
        setLoading(false)
        return
      }

      setExists(true)
      setPlayerName(data.player_name)
      setCreatedAt(new Date(data.created_at).toLocaleString())
      setLoading(false)
      setPlayConfetti(true)

      const finalScore = Number(data.score) || 0
      const duration = 1800
      const start = performance.now()
      function tick(now: number) {
        const t = Math.min(1, (now - start) / duration)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        setDisplayScore(Math.round(eased * finalScore))
        if (t < 1) requestAnimationFrame(tick)
        else setDisplayScore(finalScore)
      }
      requestAnimationFrame(tick)
    }

    load()
    return () => { cancelled = true }
  }, [id])

  const invalidNotice = (
    <div className="rounded-xl border border-neutral-700 py-12 px-6 flex flex-col items-center justify-center gap-6 w-full max-w-md">
      <p className="text-sm text-neutral-500 font-thai text-center">
        ไม่พบผลการเล่นสำหรับลิงก์นี้<br />กรุณาลองแสกนใหม่ที่หน้าบูธ
      </p>
    </div>
  )

  return (
    <div className="min-h-dvh w-screen bg-neutral-900 select-none relative flex items-center justify-center py-10 px-4">
      <ConfettiCanvas play={!!playConfetti} />

      <div className="z-30 w-full flex flex-col items-center gap-6 landscape:justify-center landscape:gap-10">
        <span className="flex flex-row justify-center items-center mt-9">
          <img src={gameLogo} alt="Cascade Failure Logo" className="w-80 h-auto mr-2" />
        </span>

        <p className="text-white font-thai">ขอบคุณที่เล่น! ไว้เจอกันใหม่น้า</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
          </div>
        ) : exists ? (
          <ResultCard score={displayScore} playerName={playerName} createdAt={createdAt} />
        ) : (
          invalidNotice
        )}

        <p className="text-white font-thai text-sm text-center">นำผลสรุปคะแนน แท็คมาอวดกันได้ที่<br /><img src={iglogo} className="w-4 h-4 inline" /><b>{" "}comclub_kmutnb</b></p>

        <span className="flex flex-row justify-center items-center mb-9">
          <img src={ccklogo} alt="Computer Club Logo" className="w-5 h-5 mr-2" />
          <h1 className="font-pixel text-4xl text-white tracking-tight">ชมรมคอมพิวเตอร์ มจพ.</h1>
        </span>

        {/* {exists && !loading && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white flex items-center gap-2 disabled:opacity-50 font-thai"
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            ดาวน์โหลดภาพ
          </button>
        )} */}
      </div>

    </div>
  )
}

export default EndScreen