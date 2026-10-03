import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { IS_LIVE, replay } from '../source'
import { EVENT_STEP, STORY, type StoryStep, tint } from '../story'
import { type PhalanxEvent, similarResource } from '../types'
import { type State, useNow } from '../usePhalanx'
import { AgentName } from './ui'

const BASE_MODULES = ['auth', 'payments', 'ui', 'db']
const STEPS: StoryStep[] = ['setup', 'claim', 'block', 'warn', 'handoff', 'brief']
const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const
const FADE = { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } as const

// Plain-English narration of the latest event, so the demo explains itself.
function caption(e: PhalanxEvent | undefined, prev: PhalanxEvent | undefined) {
  if (!e || e.type === 'reset') return 'Team is set up. Everyone points their agents at the repo.'
  switch (e.type) {
    case 'claimed':
      return prev?.type === 'woken' && prev.agentId === e.agentId
        ? `${e.agentId} picks up ${e.resource} right where the last agent left off.`
        : `${e.agentId} claims ${e.resource} before touching it.`
    case 'blocked':
      return `${e.agentId} tries to take ${e.resource} too. The database rejects it.`
    case 'waiting':
      return `Instead of guessing, ${e.agentId} waits in line for ${e.resource}.`
    case 'warning':
      return `"${e.resource}" sounds a lot like "${similarResource(e)}". ${e.agentId} gets a heads-up, not a block.`
    case 'decision':
      return `${e.agentId} records a decision: "${e.text}"`
    case 'released':
      return `${e.agentId} finishes and releases ${e.resource}.`
    case 'woken':
      return `${e.agentId} is woken the moment ${e.resource} frees up. No polling.`
    case 'briefing':
      return `${e.agentId} joins late and is fully briefed in one call.`
  }
}

type Role = 'holder' | 'rejected' | 'waiting' | 'woken'

const ROLE: Record<Role, { step: StoryStep; note?: string }> = {
  holder: { step: 'claim' },
  rejected: { step: 'block', note: 'rejected' },
  waiting: { step: 'block', note: 'waiting' },
  woken: { step: 'handoff', note: 'woken' },
}

// One badge per agent per module. The badge for the module an agent most
// recently acted on carries a shared layoutId, so it glides between tiles.
function Chip({ id, role, travels }: { id: string; role: Role; travels: boolean }) {
  const { step, note } = ROLE[role]
  const color = STORY[step].color
  return (
    <motion.span
      layout
      layoutId={travels ? `agent-${id}` : undefined}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={
        role === 'rejected'
          ? { opacity: 1, scale: 1, x: [0, -6, 6, -4, 4, 0] }
          : { opacity: 1, scale: 1, x: 0 }
      }
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ layout: SPRING, default: FADE, x: { duration: 0.45, delay: 0.35 } }}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[15px] font-medium whitespace-nowrap"
      style={{
        ...tint(color, 0.14, 0.45),
        color,
        textDecoration: role === 'rejected' ? 'line-through' : undefined,
        transition: 'background-color .4s, border-color .4s, color .4s',
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color, transition: 'background-color .4s' }} />
      {id}
      {note && <span className="text-[12px] font-normal opacity-80">{note}</span>}
    </motion.span>
  )
}

function Progress() {
  const now = useNow(100)
  if (IS_LIVE || !replay.start) return null
  const p = Math.min(1, (now - replay.start) / replay.total)
  return (
    <div className="h-0.5 bg-white/[0.04]">
      <div className="h-full bg-white/25" style={{ width: `${p * 100}%`, transition: 'width .1s linear' }} />
    </div>
  )
}

export function Stage({ state, bare }: { state: State; bare?: boolean }) {
  const latest = state.feed[0]?.event
  const step: StoryStep = latest && latest.type !== 'reset' ? EVENT_STEP[latest.type] : 'setup'
  const stepIndex = STEPS.indexOf(step)
  const color = STORY[step].color
  const blocked = state.alert
  const warning = state.warning
  const similar = warning ? similarResource(warning) : null
  const briefing = latest?.type === 'briefing' ? state.briefing : null
  const modules = [...new Set([...BASE_MODULES, ...Object.keys(state.claims)])]

  const chipsFor = (m: string): [string, Role][] => {
    const chips: [string, Role][] = []
    const holder = state.claims[m]
    if (holder) chips.push([holder.agentId, 'holder'])
    if (blocked?.resource === m) chips.push([blocked.agentId, 'rejected'])
    for (const a of state.waiters[m] ?? []) if (a !== blocked?.agentId) chips.push([a, 'waiting'])
    for (const a of Object.values(state.agents)) {
      if (a.status === 'woken' && a.resource === m && !holder) chips.push([a.id, 'woken'])
    }
    return chips
  }

  return (
    <div className={bare ? '' : 'overflow-hidden rounded-xl border border-line bg-panel shadow-[0_30px_80px_rgb(0_0_0/0.35)]'}>
      <div className="grid grid-cols-6 border-b border-edge">
        {STEPS.map((s, i) => {
          const c = STORY[s].color
          const on = i === stepIndex
          const done = i < stepIndex
          return (
            <div
              key={s}
              className="relative flex items-center justify-center gap-2 px-2 py-4 text-[15px] lg:justify-start lg:px-4"
              style={{ color: on || done ? c : '#6e7077', transition: 'color .4s' }}
            >
              {on && (
                <motion.span
                  layoutId="step-highlight"
                  transition={SPRING}
                  className="absolute inset-0"
                  style={{ background: `${c}14`, boxShadow: `inset 0 -2px 0 ${c}` }}
                />
              )}
              <span
                className="relative grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
                style={{
                  ...(on ? { background: c, color: '#191a1d' } : { boxShadow: `inset 0 0 0 1px ${done ? c : '#ffffff22'}` }),
                  transition: 'background-color .4s, color .4s',
                }}
              >
                {i + 1}
              </span>
              <span className="relative hidden font-medium lg:inline">{STORY[s].label}</span>
            </div>
          )
        })}
      </div>
      <Progress />

      <div className="p-5 sm:p-8">
        <div className="relative min-h-[84px]">
          <AnimatePresence initial={false}>
            <motion.p
              key={state.feed[0]?.id ?? 0}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={FADE}
              className="absolute inset-x-0 top-0 text-[22px] leading-snug font-semibold tracking-tight text-balance sm:text-[30px]"
              style={{ color }}
            >
              {caption(latest, state.feed[1]?.event)}
            </motion.p>
          </AnimatePresence>
        </div>

        <LayoutGroup>
          <motion.div layout className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            <AnimatePresence initial={false}>
              {modules.map((m) => {
                const holder = state.claims[m]
                const hit = blocked?.resource === m
                const warned = warning && (warning.resource === m || similar === m)
                const chips = chipsFor(m)
                return (
                  <motion.div
                    key={m}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ layout: SPRING, default: FADE }}
                    className={`rounded-lg border p-4 ${holder || hit || warned ? '' : 'border-dashed border-edge'}`}
                    style={{
                      ...(hit
                        ? tint(STORY.block.color, 0.1, 0.6)
                        : warned
                          ? tint(STORY.warn.color, 0.08, 0.55)
                          : holder
                            ? tint(STORY.claim.color, 0.05, 0.3)
                            : { background: 'transparent' }),
                      transition: 'background-color .5s, border-color .5s',
                    }}
                  >
                    <div className="font-mono text-[17px] font-medium text-fg">{m}</div>
                    <AnimatePresence>
                      {warning?.resource === m && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-0.5 overflow-hidden text-[13px] font-medium"
                          style={{ color: STORY.warn.color }}
                        >
                          similar to {similar}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="mt-3 flex min-h-[64px] flex-col items-start gap-1.5">
                      <AnimatePresence mode="popLayout">
                        {chips.map(([a, role]) => (
                          <Chip key={a} id={a} role={role} travels={state.agents[a]?.resource === m} />
                        ))}
                        {chips.length === 0 && (
                          <motion.span
                            key="free"
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-1 text-[15px] text-faint"
                          >
                            free
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        <AnimatePresence initial={false}>
          {state.decisions[0] && (
            <motion.div
              key="decision"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={FADE}
              className="overflow-hidden"
            >
              <div
                className="flex items-center gap-3 rounded-lg border px-5 py-4 text-[16px]"
                style={tint(STORY.handoff.color, 0.08, 0.3)}
              >
                <span className="font-medium" style={{ color: STORY.handoff.color }}>Decision</span>
                <span className="text-fg">{state.decisions[0].text}</span>
                <span className="ml-auto text-faint">{state.decisions[0].agentId}</span>
              </div>
            </motion.div>
          )}

          {briefing && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={FADE}
              className="overflow-hidden"
            >
              <div className="rounded-lg border p-5 text-[16px]" style={tint(STORY.brief.color, 0.08, 0.35)}>
                <div style={{ color: STORY.brief.color }} className="font-medium">
                  What <AgentName id={briefing.agentId} /> sees on joining
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    {briefing.briefing.claims.map((cl) => (
                      <div key={cl.resource} className="py-0.5 text-mute">
                        <span className="font-mono text-fg">{cl.resource}</span> is held by {cl.agentId}
                      </div>
                    ))}
                  </div>
                  <div>
                    {briefing.briefing.decisions.map((d, i) => (
                      <div key={i} className="py-0.5 text-mute">
                        Decided: <span className="text-fg">{d.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
