import { useEffect, useRef } from 'react'
import { useSearchParams } from "react-router";
import Phaser from 'phaser'

class MainScene extends Phaser.Scene {
  constructor() {
    super('main')
  }
  create() {
    this.add.text(100, 100, `Hello Phaser 4 id ${id}`)
  }
}

export default function PhaserGame() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1000,
      height: 800,
      parent: containerRef.current,
      scene: [MainScene],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className='w-screen h-screen flex justify-center items-center'>
      <div ref={containerRef} />
    </div>
  )
}