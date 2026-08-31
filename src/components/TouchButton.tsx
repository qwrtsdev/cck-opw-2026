function TouchButton({ label, onPress, onRelease }: { label: string; onPress: () => void; onRelease: () => void }) {
  return (
    <button
      className="w-16 h-16 rounded-full text-white font-bold text-lg select-none
                 bg-neutral-800 border border-neutral-700
                 active:bg-neutral-600"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease(); }}
      onTouchCancel={(e) => { e.preventDefault(); onRelease(); }}
    >
      {label}
    </button>
  )
}

export default TouchButton;