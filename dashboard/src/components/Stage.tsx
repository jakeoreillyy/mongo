import { EVENT_STEP, STORY, type StoryStep, tint } from '../story'
import { type PhalanxEvent, similarResource } from '../types'
import type { State } from '../usePhalanx'
import { AgentName } from './ui'

const BASE_MODULES = ['auth', 'payments', 'ui', 'db']
const STEPS: StoryStep[] = ['setup', 'claim', 'block', 'warn', 'handoff', 'brief']

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

function Chip({ id, step, note, strike }: { id: string; step: StoryStep; note?: string; strike?: boolean }) {
  const color = STORY[step].color
  return (
    <span
      className={`enter inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[15px] font-medium ${
        strike ? 'line-through' : ''
      }`}
      style={{ ...tint(color, 0.14, 0.45), color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {id}
      {note && <span className="text-[12px] font-normal opacity-80">{note}</span>}
    </span>
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
              className="relative flex items-center justify-center gap-2 px-2 py-4 text-[15px] transition-colors lg:justify-start lg:px-4"
              style={{ color: on || done ? c : '#6e7077', background: on ? `${c}14` : undefined }}
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
                style={on ? { background: c, color: '#191a1d' } : { boxShadow: `inset 0 0 0 1px ${done ? c : '#ffffff22'}` }}
              >
                {i + 1}
              </span>
              <span className="hidden font-medium lg:inline">{STORY[s].label}</span>
              {on && <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: c }} />}
            </div>
          )
        })}
      </div>

      <div className="p-5 sm:p-8">
        <p
          key={state.feed[0]?.id ?? 0}
          className="enter min-h-[72px] text-[22px] leading-snug font-semibold tracking-tight text-balance sm:text-[30px]"
          style={{ color }}
        >
          {caption(latest, state.feed[1]?.event)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {modules.map((m) => {
            const holder = state.claims[m]
            const hit = blocked?.resource === m
            const warned = warning && (warning.resource === m || similar === m)
            const queue = state.waiters[m] ?? []
            return (
              <div
                key={hit ? `${m}-${blocked.key}` : m}
                className={`rounded-lg border p-4 transition-colors ${hit ? 'hit' : holder ? '' : 'border-dashed border-edge'}`}
                style={
                  hit
                    ? { borderColor: `${STORY.block.color}88` }
                    : warned
                      ? tint(STORY.warn.color, 0.08, 0.55)
                      : holder
                        ? tint(STORY.claim.color, 0.05, 0.3)
                        : undefined
                }
              >
                <div className="font-mono text-[17px] font-medium text-fg">{m}</div>
                {warning?.resource === m && (
                  <div className="mt-0.5 text-[13px] font-medium" style={{ color: STORY.warn.color }}>
                    similar to {similar}
                  </div>
                )}
                <div className="mt-3 flex min-h-[64px] flex-col items-start gap-1.5">
                  {holder ? (
                    <Chip id={holder.agentId} step="claim" />
                  ) : (
                    <span className="py-1 text-[15px] text-faint">free</span>
                  )}
                  {hit && <Chip id={blocked.agentId} step="block" strike />}
                  {!hit && queue.map((a) => <Chip key={a} id={a} step="block" note="waiting" />)}
                </div>
              </div>
            )
          })}
        </div>

        {state.decisions[0] && (
          <div
            className="enter mt-4 flex items-center gap-3 rounded-lg border px-5 py-4 text-[16px]"
            style={tint(STORY.handoff.color, 0.08, 0.3)}
          >
            <span className="font-medium" style={{ color: STORY.handoff.color }}>Decision</span>
            <span className="text-fg">{state.decisions[0].text}</span>
            <span className="ml-auto text-faint">{state.decisions[0].agentId}</span>
          </div>
        )}

        {briefing && (
          <div className="enter mt-4 rounded-lg border p-5 text-[16px]" style={tint(STORY.brief.color, 0.08, 0.35)}>
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
        )}
      </div>
    </div>
  )
}
