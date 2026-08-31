import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Phaser from 'phaser'

import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { BootScene } from '@/game/scenes/BootScene'
import { GameScene } from '@/game/scenes/GameScene'
import { UIScene } from '@/game/scenes/UIScene'
import { GameOverScene } from '@/game/scenes/GameOverScene'

export default function PhaserGame() {
  const [params] = useSearchParams();
  const id = params.get("id");

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const debugTextRef = useRef<Phaser.GameObjects.Text | null>(null)
  const [lastInput, setLastInput] = useState<any>(null)
  const [inputsByType, setInputsByType] = useState<Record<string, any>>({})

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return

    try {
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 1400,
        height: 900,
        parent: containerRef.current,
        backgroundColor: '#1a1a2e',
        scene: [BootScene, GameScene, UIScene, GameOverScene],
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      })
      
      console.log('Phaser game initialized successfully')
    } catch (error) {
      console.error('Error initializing Phaser game:', error)
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
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
        setInputsByType(prev => ({ ...prev, [payload.type]: payload }))

        if (debugTextRef.current) {
          debugTextRef.current.setText(
            Object.entries({ ...inputsByType, [payload.type]: payload })
              .map(([type, p]: [string, any]) => `${type}: ${JSON.stringify(p.payload)}`)
              .join('\n')
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
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-green-400 text-xs font-mono p-3 rounded max-w-sm space-y-1">
        {Object.keys(inputsByType).length === 0
          ? 'no input received yet'
          : Object.entries(inputsByType).map(([type, p]: [string, any]) => (
            <div key={type}>{type}: {JSON.stringify(p.payload)}</div>
          ))
        }
      </div>
    </div>
  )
}