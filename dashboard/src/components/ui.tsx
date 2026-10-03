import type { ReactNode } from 'react'

// Muted, evenly weighted hues so agents are distinguishable without shouting.
const AGENT_COLORS = ['#8e9cf0', '#d9a55b', '#5fb3c9', '#c98bb5', '#9cbf6b', '#d98a6a']

export function agentColor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AGENT_COLORS[h % AGENT_COLORS.length]
}

export function AgentName({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-fg">
      <span className="size-2 rounded-full" style={{ background: agentColor(id) }} />
      {id}
    </span>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 text-fg">
      <path
        d="M10 2.5 16.5 5v4.5c0 4-2.7 6.4-6.5 7.5-3.8-1.1-6.5-3.5-6.5-7.5V5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 9.5h6M7 12.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Panel({ title, meta, children, className = '' }: {
  title: string
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-lg border border-edge bg-panel ${className}`}>
      <header className="flex h-11 items-center justify-between border-b border-edge px-4">
        <h2 className="text-[13px] font-medium text-fg">{title}</h2>
        {meta && <div className="text-[12px] text-faint">{meta}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 5) return 'now'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m`
}
