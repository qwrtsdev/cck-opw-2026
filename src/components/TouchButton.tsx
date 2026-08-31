function TouchButton({ label, onPress, onRelease }: { label: string; onPress: () => void; onRelease: () => void }) {
  return (
    <button
      className="w-16 h-16 rounded-full text-white font-bold text-lg select-none
                 bg-neutral-800 border border-neutral-700
                 active:bg-neutral-600
                 transition-colors duration-75"
      style={{
        touchAction: 'none',
        width: 'clamp(48px, 10vh, 64px)',
        height: 'clamp(48px, 10vh, 64px)',
        fontSize: 'clamp(14px, 2.5vh, 18px)',
      }}
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease(); }}
      onTouchCancel={(e) => { e.preventDefault(); onRelease(); }}
    >
      {label}
    </button>
  )
}

export default TouchButton;