import { Agents } from './components/Agents'
import { Board } from './components/Board'
import { BriefingPanel } from './components/BriefingPanel'
import { Feed } from './components/Feed'
import { Logo } from './components/ui'
import { IS_LIVE, TEAM_ID } from './source'
import { useNow, usePhalanx } from './usePhalanx'

// The detailed operator view, kept off the landing page. Open with ?view=dashboard.
export function Dashboard() {
  const { state, connected, via } = usePhalanx()
  const now = useNow()

  return (
    <div className="min-h-full">
      <nav className="border-b border-edge">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <a href="./" className="flex items-center gap-2 text-[16px]">
            <Logo />
            <span className="font-semibold">Phalanx</span>
            <span className="text-faint">/</span>
            <span className="text-mute">{TEAM_ID}</span>
          </a>
          <div className="flex items-center gap-2 text-[13px] text-mute">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-leaf' : 'bg-alarm'}`} />
            {!IS_LIVE ? 'Demo replay' : !connected ? 'Reconnecting' : via === 'stream' ? 'Live · change stream' : 'Live · polling'}
          </div>
        </div>
      </nav>
      <main className="mx-auto grid max-w-[1200px] gap-4 px-4 py-8 sm:px-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Board
            claims={state.claims}
            contested={state.alert?.resource ?? null}
            alertKey={state.alert?.key ?? 0}
            waiters={state.waiters}
            warning={state.warning}
            now={now}
          />
          <BriefingPanel briefing={state.briefing} now={now} />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <Agents agents={state.agents} />
          <Feed feed={state.feed} now={now} via={via} />
        </div>
      </main>
    </div>
  )
}
