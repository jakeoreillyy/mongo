import { useState } from 'react'
import { IS_LIVE, fetchBriefing } from '../source'
import type { Briefing } from '../types'
import type { State } from '../usePhalanx'
import { AgentName, Panel, timeAgo } from './ui'

export function BriefingPanel({ briefing, now }: { briefing: State['briefing']; now: number }) {
  const [manual, setManual] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(false)
  const data = manual ?? briefing?.briefing

  const run = async () => {
    setLoading(true)
    try {
      setManual(await fetchBriefing())
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel
      title="Briefing"
      meta={
        IS_LIVE ? (
          <button
            onClick={run}
            className="rounded border border-line px-2 py-0.5 text-[12px] text-fg transition hover:bg-white/5"
          >
            {loading ? 'Loading…' : 'Brief a new agent'}
          </button>
        ) : (
          'What a new agent sees on joining'
        )
      }
    >
      {!data ? (
        <div className="py-6 text-center text-[13px] text-faint">
          When a new agent joins, it gets every active claim and recent decision in one call.
        </div>
      ) : (
        <div key={briefing?.key} className="enter">
          {briefing && !manual && (
            <div className="mb-4 text-[13px] text-mute">
              <AgentName id={briefing.agentId} /> joined and was briefed in one call.
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[12px] text-faint">Active claims</div>
              <ul className="divide-y divide-edge">
                {data.claims.map((c) => (
                  <li key={c.resource} className="flex items-center justify-between py-2 text-[13px]">
                    <span className="font-mono text-fg">{c.resource}</span>
                    <span className="text-mute"><AgentName id={c.agentId} /></span>
                  </li>
                ))}
                {data.claims.length === 0 && <li className="py-2 text-[13px] text-faint">None</li>}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-[12px] text-faint">Recent decisions</div>
              <ul className="divide-y divide-edge">
                {data.decisions.map((d, i) => (
                  <li key={d.id ?? i} className="py-2">
                    <div className="text-[13px] text-fg">{d.text}</div>
                    <div className="mt-0.5 text-[12px] text-faint">
                      <span className="font-mono">{d.module}</span> · {d.agentId} · {timeAgo(d.createdAt, now)}
                    </div>
                  </li>
                ))}
                {data.decisions.length === 0 && <li className="py-2 text-[13px] text-faint">None</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
