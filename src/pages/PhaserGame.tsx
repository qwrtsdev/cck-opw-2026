import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Phaser from 'phaser'

import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { supabase } from "@/lib/supabase"

export default function PhaserGame() {
  const [params] = useSearchParams();
  const id = params.get("id");

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const debugTextRef = useRef<Phaser.GameObjects.Text | null>(null)
  const [lastInput, setLastInput] = useState<any>(null)

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return

    class MainScene extends Phaser.Scene {
      constructor() {
        super("main")
      }

      create() {
        this.add.text(100, 100, `Hello World`)
        // debug overlay — shows the raw last-received payload on the canvas itself
        debugTextRef.current = this.add.text(20, 20, 'waiting for input...', {
          fontSize: '16px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 8, y: 6 },
        })
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1400,
      height: 900,
      parent: containerRef.current,
      scene: [MainScene],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`session-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
        (payload) => {
          console.log('[session update]', payload.new)
        }
      )
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        console.log('[input]', payload)
        setLastInput(payload)

        if (debugTextRef.current) {
          debugTextRef.current.setText(
            `${payload.type} | player: ${payload.playerId?.slice(0, 8)}\n${JSON.stringify(payload.payload)}`
          )
        }
      })
      .subscribe((status) => {
        console.log('[channel status]', status) // watch for 'SUBSCRIBED' vs 'CHANNEL_ERROR'/'TIMED_OUT'
      })

    return () => { supabase.removeChannel(channel) }
  }, [id])

  return (
    <div className='relative w-screen h-screen flex justify-center items-center bg-neutral-900'>
      <div className="absolute inset-0 z-0">
        <GlyphMatrix cellSize={20} />
      </div>

      <div ref={containerRef} className='border-white border-4 relative' />

      {/* plain HTML debug panel, outside the canvas — easier to read than squinting at Phaser text */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-green-400 text-xs font-mono p-3 rounded max-w-sm break-all">
        {lastInput ? JSON.stringify(lastInput, null, 2) : 'no input received yet'}
      </div>
    </div>
  )
}