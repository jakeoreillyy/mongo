import type { Via } from '../source'
import { EVENT_STEP, STORY } from '../story'
import type { FeedItem } from '../usePhalanx'
import { similarResource } from '../types'
import { AgentName, Panel, timeAgo } from './ui'

const OP = {
  claimed: 'claims.insertOne',
  released: 'claims.deleteOne',
  blocked: 'E11000 duplicate key',
  decision: 'decisions.insertOne',
  briefing: 'aggregate',
  waiting: 'waiters.insertOne',
  woken: 'change stream · claims delete',
  warning: '$vectorSearch',
} as const

function Line({ item }: { item: FeedItem }) {
  const e = item.event
  const res = (r: string) => <span className="font-mono text-fg">{r}</span>
  switch (e.type) {
    case 'claimed':
      return <><AgentName id={e.agentId} /> claimed {res(e.resource)}</>
    case 'released':
      return e.agentId && e.resource ? <><AgentName id={e.agentId} /> released {res(e.resource)}</> : <>A claim was released</>
    case 'blocked':
      return <><AgentName id={e.agentId} /> was blocked from {res(e.resource)}, held by <AgentName id={e.heldBy} /></>
    case 'decision':
      return <><AgentName id={e.agentId} /> decided: <span className="text-fg">{e.text}</span></>
    case 'briefing':
      return <><AgentName id={e.agentId} /> joined and read the briefing</>
    case 'waiting':
      return <><AgentName id={e.agentId} /> is waiting for {res(e.resource)}</>
    case 'woken':
      return <><AgentName id={e.agentId} /> was woken, {res(e.resource)} is free</>
    case 'warning':
      return <><AgentName id={e.agentId} /> claimed {res(e.resource)}, similar to {res(similarResource(e))}</>
    default:
      return null
  }
}

export function Feed({ feed, now, via }: { feed: FeedItem[]; now: number; via?: Via }) {
  const items = feed.filter((i) => i.event.type !== 'reset')
  return (
    <Panel title="Activity" meta={via === 'polling' ? 'via polling' : via === 'replay' ? 'demo replay' : 'via change stream'}>
      {items.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-faint">No activity yet</div>
      ) : (
        <ol className="-my-1">
          {items.map((item) => {
            const type = item.event.type as keyof typeof OP
            const blocked = type === 'blocked'
            return (
              <li key={item.id} className="enter flex gap-3 border-b border-edge py-3 last:border-0">
                <span className="mt-[7px] size-2 shrink-0 rounded-full" style={{ background: STORY[EVENT_STEP[type]].color }} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] leading-5 ${blocked ? 'text-alarm' : 'text-mute'}`}>
                    <Line item={item} />
                  </div>
                  <div className="mt-1 font-mono text-[11px]" style={{ color: `${STORY[EVENT_STEP[type]].color}b0` }}>{OP[type]}</div>
                </div>
                <span className="text-[12px] text-faint tabular-nums">{timeAgo(item.at, now)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
