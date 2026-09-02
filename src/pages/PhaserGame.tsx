// PhaserGame.tsx

import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Phaser from 'phaser'

import { supabase } from '@/lib/supabase'
import { GlyphMatrix } from "@/components/ui/glyph-matrix"
import { EventBus } from '@/game/eventBus'
import { BootScene } from '@/game/scenes/BootScene'
import { GameScene } from '@/game/scenes/GameScene'
import { UIScene } from '@/game/scenes/UIScene'
import { GameOverScene } from '@/game/scenes/GameOverScene'

type GameOverPayload = {
  score: number
  kills: number
  survivalTime: number
}

export default function PhaserGame() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navigate = useNavigate()

  const gameWidth = 1280
  const gameHeight = 960

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const scorePersistedRef = useRef(false)
  const claimedPlayerNameRef = useRef<string>('Anonymous')

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return

    try {
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: gameWidth,
        height: gameHeight,
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
        if (payload?.playerName && typeof payload.playerName === 'string' && payload.playerName.trim()) {
          claimedPlayerNameRef.current = payload.playerName.trim()
        }
        // Forward into the shared EventBus that GameScene is subscribed to.
        EventBus.emit('controller-input', payload)
      })
      .subscribe((status) => {
        console.log('[channel status]', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    const handleReturnHome = () => {
      navigate('/')
    }

    EventBus.on('game-over-return-home', handleReturnHome)

    return () => {
      EventBus.off('game-over-return-home', handleReturnHome)
    }
  }, [navigate])

  useEffect(() => {
    const handleGameOverTriggered = async (payload: GameOverPayload) => {
      if (!id) return
      if (scorePersistedRef.current) return
      scorePersistedRef.current = true

      // Ensure this page has a Supabase auth session before touching RLS tables.
      const { data: currentSession } = await supabase.auth.getSession()
      if (!currentSession.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          console.error('[auth] anonymous sign-in failed', signInError)
        }
      }

      const { data: sessionRow, error: sessionError } = await supabase
        .from('sessions')
        .select('player_id')
        .eq('id', id)
        .maybeSingle()

      if (sessionError) {
        console.error('[session lookup] failed', {
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details,
        })
      }

      const claimedPlayerId = sessionRow?.player_id ?? null
      let playerName = claimedPlayerNameRef.current || 'Anonymous'

      if (claimedPlayerId) {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', claimedPlayerId)
          .maybeSingle()

        if (profileError) {
          console.error('[profile lookup] failed', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
          })
        }

        if (profileRow?.display_name && profileRow.display_name.trim()) {
          playerName = profileRow.display_name.trim()
        }
      }

      if ((playerName === 'Anonymous' || !playerName) && claimedPlayerNameRef.current && claimedPlayerNameRef.current !== 'Anonymous') {
        playerName = claimedPlayerNameRef.current
      }

      const { error: insertScoreError } = await supabase
        .from('scores')
        .insert({
          session_id: id,
          // This write runs on the game display client, which may not be the
          // same auth user that claimed the session. Keep FK nullable.
          player_id: null,
          player_name: playerName,
          score: Math.max(0, Math.floor(Number(payload?.score ?? 0)))
        })

      if (insertScoreError) {
        console.error('[score insert] failed', {
          code: insertScoreError.code,
          message: insertScoreError.message,
          details: insertScoreError.details,
          hint: insertScoreError.hint,
        })
      }

      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended' })
        .eq('id', id)

      if (error) {
        console.error('[session end update] failed', {
          code: error.code,
          message: error.message,
          details: error.details,
        })
      }
    }

    EventBus.on('game-over-triggered', handleGameOverTriggered)

    return () => {
      EventBus.off('game-over-triggered', handleGameOverTriggered)
    }
  }, [id])

  return (
    <div className='relative w-screen h-screen flex justify-center items-center bg-neutral-900'>
      <div className="absolute inset-0 z-0">
        <GlyphMatrix cellSize={20} />
      </div>

      <div
        ref={containerRef}
        className='relative w-7xl h-240 max-w-[92vw] max-h-[85vh]'
      />

      {/* plain HTML debug panel, outside the canvas — easier to read than squinting at Phaser text */}
      {/* <div className="absolute bottom-4 left-4 z-10 bg-black/80 text-green-400 text-xs font-mono p-3 rounded max-w-sm space-y-1">
        <div>channel: {channelStatus}</div>
        {Object.keys(inputsByType).length === 0
          ? 'no input received yet'
          : Object.entries(inputsByType).map(([type, p]: [string, any]) => (
            <div key={type}>{type}: {JSON.stringify(p.payload)}</div>
          ))
        }
      </div> */}
    </div>
  )
}