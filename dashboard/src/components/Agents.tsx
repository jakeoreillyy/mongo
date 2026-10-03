import type { AgentState } from '../usePhalanx'
import { AgentName, Panel } from './ui'

const STATUS = {
  working: { text: 'Working', cls: 'text-mute' },
  blocked: { text: 'Blocked', cls: 'text-alarm' },
  waiting: { text: 'Waiting', cls: 'text-block' },
  woken: { text: 'Woken', cls: 'text-handoff' },
  idle: { text: 'Idle', cls: 'text-faint' },
  joining: { text: 'Onboarded', cls: 'text-mute' },
}

export function Agents({ agents }: { agents: Record<string, AgentState> }) {
  const list = Object.values(agents).sort((a, b) => a.id.localeCompare(b.id))
  return (
    <Panel title="Agents" meta={list.length}>
      {list.length === 0 ? (
        <div className="py-4 text-center text-[13px] text-faint">No agents connected</div>
      ) : (
        <ul className="-my-1">
          {list.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-[13px]">
              <div className="flex items-center gap-3">
                <AgentName id={a.id} />
                <span className="font-mono text-[12px] text-faint">{a.resource ?? ''}</span>
              </div>
              <span className={STATUS[a.status].cls}>{STATUS[a.status].text}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
