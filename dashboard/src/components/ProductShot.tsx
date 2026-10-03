import { type ReactNode, useEffect, useRef } from 'react'

// Linear-style hero shot: an app window that starts tilted back and settles
// flat as the page scrolls.
export function ProductShot({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      const el = ref.current
      if (!el) return
      const p = Math.min(1, Math.max(0, window.scrollY / 420))
      el.style.transform = `perspective(1600px) rotateX(${14 * (1 - p)}deg) scale(${0.94 + 0.06 * p})`
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-20 -top-24 bottom-0 -z-10 opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(50% 45% at 50% 30%, rgb(91 156 245 / 0.28), transparent 70%), radial-gradient(35% 35% at 75% 60%, rgb(167 139 250 / 0.18), transparent 70%), radial-gradient(35% 35% at 25% 65%, rgb(62 207 142 / 0.14), transparent 70%)',
        }}
      />
      <div ref={ref} className="origin-top will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1d1e22] shadow-[0_40px_120px_rgb(0_0_0/0.55)] ring-1 ring-black/40">
          <div className="flex h-10 items-center gap-2 border-b border-edge bg-white/[0.02] px-4">
            <span className="size-3 rounded-full bg-[#ff5f57]/80" />
            <span className="size-3 rounded-full bg-[#febc2e]/80" />
            <span className="size-3 rounded-full bg-[#28c840]/80" />
            <span className="ml-3 text-[13px] text-faint">{title}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
