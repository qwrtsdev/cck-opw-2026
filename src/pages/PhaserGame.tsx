import { useEffect, useRef } from 'react'
import { useSearchParams } from "react-router";
import Phaser from 'phaser'

import { GlyphMatrix } from "@/components/ui/glyph-matrix"

export default function PhaserGame() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return

    class MainScene extends Phaser.Scene {
      constructor() {
        super("main")
      }

      create() {
        this.add.text(100, 100, `Hello Phaser 4 id ${id ?? ""}`)
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
  }, [id])

  return (
    <div className='relative w-screen h-screen flex justify-center items-center bg-neutral-900'>
      <div className="absolute inset-0 z-0">
        <GlyphMatrix cellSize={20} />
      </div>

      <div ref={containerRef} className='border-white border-4 relative' />
    </div>
  )
}