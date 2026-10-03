import { STORY } from '../story'
import { type Claim, type Warning, similarResource } from '../types'
import { AgentName, Panel } from './ui'

const RESOURCES = ['auth', 'payments', 'ui', 'db']

function Tile({ resource, claim, contested, waiting, similar, now }: {
  resource: string
  claim?: Claim
  contested: boolean
  waiting: string[]
  similar: string | null
  now: number
}) {
  const total = claim ? new Date(claim.expiresAt).getTime() - new Date(claim.createdAt).getTime() : 1
  const left = claim ? Math.max(0, new Date(claim.expiresAt).getTime() - now) : 0

  return (
    <div
      className={`relative overflow-hidden rounded-md border p-4 ${
        contested ? 'hit border-alarm/50' : claim ? 'border-line bg-raised' : 'border-edge'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-fg">{resource}</span>
        {claim ? (
          <span className="flex items-center gap-1.5 text-[12px] text-mute">
            <span className="size-1.5 rounded-full bg-leaf" />
            Held · {Math.ceil(left / 1000)}s
          </span>
        ) : (
          <span className="text-[12px] text-faint">Free</span>
        )}
      </div>

      <div className="mt-5 min-h-[40px]">
        {claim ? (
          <>
            <div className="truncate text-[14px] text-fg">{claim.task}</div>
            <div className="mt-1 text-[13px] text-mute">
              <AgentName id={claim.agentId} />
            </div>
          </>
        ) : (
          <div className="text-[13px] text-faint">Nobody is working here</div>
        )}
      </div>

      {contested && <div className="mt-3 text-[12px] font-medium text-alarm">Second claim rejected</div>}
      {waiting.length > 0 && (
        <div className="mt-3 text-[12px] font-medium" style={{ color: STORY.block.color }}>
          Waiting: {waiting.join(', ')}
        </div>
      )}
      {similar && (
        <div className="mt-3 text-[12px] font-medium" style={{ color: STORY.warn.color }}>
          Similar to {similar}
        </div>
      )}

      {claim && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div
            className="h-full bg-leaf/70 transition-[width] duration-300 ease-linear"
            style={{ width: `${(left / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function Board({ claims, contested, alertKey, waiters, warning, now }: {
  claims: Record<string, Claim>
  contested: string | null
  alertKey: number
  waiters: Record<string, string[]>
  warning: Warning | null
  now: number
}) {
  const resources = [...new Set([...RESOURCES, ...Object.keys(claims)])]
  return (
    <Panel title="Resources" meta={`${Object.keys(claims).length} of ${resources.length} held`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {resources.map((r) => (
          <Tile
            key={contested === r ? `${r}-${alertKey}` : r}
            resource={r}
            claim={claims[r]}
            contested={contested === r}
            waiting={waiters[r] ?? []}
            similar={warning?.resource === r ? similarResource(warning) : null}
            now={now}
          />
        ))}
      </div>
    </Panel>
  )
}
