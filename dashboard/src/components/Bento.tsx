import type { ReactNode } from 'react'
import { STORY, type StoryStep, tint } from '../story'

function Pill({ step, children, strike }: { step: StoryStep; children: ReactNode; strike?: boolean }) {
  const color = STORY[step].color
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[14px] font-medium ${strike ? 'line-through' : ''}`}
      style={{ ...tint(color, 0.14, 0.45), color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

function Tile({ name, children, step }: { name: string; children?: ReactNode; step?: StoryStep }) {
  return (
    <div
      className="rounded-lg border border-edge bg-ink/60 p-3"
      style={step ? tint(STORY[step].color, 0.06, 0.4) : undefined}
    >
      <div className="font-mono text-[14px] text-fg">{name}</div>
      <div className="mt-2 flex flex-col items-start gap-1.5">{children}</div>
    </div>
  )
}

function Card({ step, title, body, className = '', children }: {
  step: StoryStep
  title: string
  body: string
  className?: string
  children: ReactNode
}) {
  const color = STORY[step].color
  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border border-edge bg-panel ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `${color}33` }}
      />
      <div className="relative flex-1 p-6 pb-0">{children}</div>
      <div className="relative p-6">
        <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color }}>
          <span className="size-1.5 rounded-full" style={{ background: color }} />
          {STORY[step].label}
        </div>
        <h3 className="mt-2 text-[22px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-[16px] leading-relaxed text-mute">{body}</p>
      </div>
    </div>
  )
}

export function Bento() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card
        step="block"
        title="Collisions are impossible"
        body="Two agents can't hold the same module. The database rejects the second claim."
        className="md:col-span-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Tile name="auth" step="block">
            <Pill step="claim">agent-1</Pill>
            <Pill step="block" strike>agent-2</Pill>
          </Tile>
          <Tile name="payments">
            <Pill step="claim">agent-2</Pill>
          </Tile>
        </div>
        <div className="mt-3 rounded-lg border border-edge bg-ink/70 px-3 py-2 font-mono text-[13px] text-alarm/90">
          E11000 duplicate key error · {'{ teamId, resource }'}
        </div>
      </Card>

      <Card step="claim" title="Every agent claims first" body="Before editing, agents say what they're taking." className="md:col-span-2">
        <div className="space-y-2 font-mono text-[14px]">
          <div className="text-fg">claim_resource("ui")</div>
          <div style={{ color: STORY.claim.color }}>→ claimed · 90s</div>
        </div>
      </Card>

      <Card step="block" title="Blocked agents wait" body="They queue up and are woken the moment it frees." className="md:col-span-2">
        <Tile name="auth">
          <Pill step="claim">agent-1</Pill>
          <span className="flex items-center gap-2 text-[13px] text-faint">
            <Pill step="block">agent-2</Pill> next in line
          </span>
        </Tile>
      </Card>

      <Card
        step="warn"
        title="Similar work gets flagged"
        body="Different names, same area? Vector Search spots it and gives a heads-up."
        className="md:col-span-2"
      >
        <div className="grid grid-cols-2 gap-2">
          <Tile name="auth">
            <Pill step="claim">agent-1</Pill>
          </Tile>
          <Tile name="login-flow" step="warn">
            <span className="text-[12px] font-medium" style={{ color: STORY.warn.color }}>similar to auth</span>
          </Tile>
        </div>
      </Card>

      <Card step="handoff" title="Decisions stick" body="Key choices are saved where every agent sees them." className="md:col-span-2">
        <div
          className="rounded-lg border px-4 py-3 text-[15px]"
          style={tint(STORY.handoff.color, 0.08, 0.35)}
        >
          <span className="font-medium" style={{ color: STORY.handoff.color }}>Decision </span>
          <span className="text-fg">Auth uses JWT, not sessions</span>
        </div>
      </Card>

      <Card
        step="brief"
        title="Newcomers are caught up instantly"
        body="A late teammate or a fresh agent gets every claim and decision in one call."
        className="md:col-span-3"
      >
        <div className="rounded-lg border p-4 text-[14px]" style={tint(STORY.brief.color, 0.07, 0.35)}>
          <div className="font-mono" style={{ color: STORY.brief.color }}>get_briefing()</div>
          <div className="mt-2 space-y-1 text-mute">
            <div><span className="font-mono text-fg">auth</span> held by agent-2</div>
            <div><span className="font-mono text-fg">login-flow</span> held by agent-3</div>
            <div>Decided: <span className="text-fg">JWT, not sessions</span></div>
          </div>
        </div>
      </Card>

      <Card
        step="claim"
        title="Crashed agents don't lock things"
        body="Every claim expires on its own if an agent dies mid-task."
        className="md:col-span-3"
      >
        <Tile name="db">
          <Pill step="claim">agent-5</Pill>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-1/4 rounded-full" style={{ background: STORY.claim.color }} />
          </div>
          <span className="text-[12px] text-faint">expires in 12s</span>
        </Tile>
      </Card>
    </div>
  )
}
