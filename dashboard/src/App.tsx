import type { ReactNode } from 'react'
import type { Brand } from './brands'
import { Bento } from './components/Bento'
import { BrandIcon } from './components/BrandIcon'
import { ProductShot } from './components/ProductShot'
import { Setup } from './components/Setup'
import { Stage } from './components/Stage'
import { Logo } from './components/ui'
import { Dashboard } from './Dashboard'
import { IS_LIVE, TEAM_ID } from './source'
import { STORY, type StoryStep } from './story'
import { usePhalanx } from './usePhalanx'

const VIEW = new URLSearchParams(location.search).get('view')
const DASHBOARD_HREF = `?view=dashboard${IS_LIVE ? '&live' : ''}`

const WORKS_WITH: [Brand, string][] = [
  ['github', 'GitHub'],
  ['discord', 'Discord'],
  ['slack', 'Slack'],
  ['mongodb', 'MongoDB'],
  ['claude', 'Claude'],
  ['cursor', 'Cursor'],
  ['windsurf', 'Windsurf'],
  ['mcp', 'MCP'],
]

const MONGO: [string, string, StoryStep | null][] = [
  ['Unique index', 'Rejects the second claim on a module.', 'block'],
  ['Atlas Vector Search', 'Spots overlapping work with different names.', 'warn'],
  ['Change streams', 'Wakes waiting agents and feeds the dashboard live.', 'handoff'],
  ['TTL index', 'Claims from crashed agents expire on their own.', 'claim'],
  ['Schema validation', 'The database refuses malformed claims.', null],
  ['Aggregation', 'Builds the briefing in a single query.', 'brief'],
]

function Word({ step, children }: { step: StoryStep; children: ReactNode }) {
  return <span style={{ color: STORY[step].color }}>{children}</span>
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[15px] font-medium text-mute">{children}</div>
}

function Landing() {
  const { state, connected } = usePhalanx()

  return (
    <div className="min-h-full overflow-x-clip">
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-2 text-[17px] font-semibold">
            <Logo />
            Phalanx
          </a>
          <div className="flex items-center gap-7 text-[15px] text-mute">
            <a href="#features" className="hidden hover:text-fg md:inline">Features</a>
            <a href="#setup" className="hidden hover:text-fg md:inline">Setup</a>
            <a href="#mongodb" className="hidden hover:text-fg md:inline">Why MongoDB</a>
            <a href={DASHBOARD_HREF} className="hidden hover:text-fg sm:inline">Dashboard</a>
            <a href="#setup" className="rounded-full bg-fg px-4 py-1.5 font-medium text-ink hover:bg-white">
              Get started
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1120px] px-4 sm:px-6">
        {/* Hero */}
        <header className="pt-24 pb-16 text-center sm:pt-32">
          <a
            href="#mongodb"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[14px] text-mute hover:text-fg"
          >
            <BrandIcon name="mongodb" className="size-4" />
            Built on MongoDB Atlas
            <span className="text-faint">→</span>
          </a>
          <h1 className="mx-auto mt-7 max-w-4xl text-[48px] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-[80px]">
            Air traffic control for your team's agents.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[20px] leading-relaxed text-mute text-pretty">
            Set up your hackathon team in one click. Then every agent knows who's working on what.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3 text-[16px]">
            <a href="#setup" className="rounded-full bg-fg px-6 py-3 font-medium text-ink hover:bg-white">
              Set up your team
            </a>
            <a href="#features" className="rounded-full border border-white/12 px-6 py-3 text-fg hover:bg-white/5">
              How it works
            </a>
          </div>
        </header>

        <div id="demo" className="pb-10">
          <ProductShot title={`phalanx · ${TEAM_ID}`}>
            <Stage state={state} bare />
          </ProductShot>
          <div className="mt-6 flex items-center justify-center gap-2 text-[14px] text-faint">
            <span className={`size-1.5 rounded-full ${connected ? 'bg-leaf' : 'bg-alarm'}`} />
            {IS_LIVE ? 'Live from MongoDB Atlas' : 'Replaying the demo script'}
          </div>
        </div>

        {/* Logos */}
        <section className="py-16">
          <div className="text-center text-[15px] text-faint">Works with the tools your team already uses</div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {WORKS_WITH.map(([b, name]) => (
              <span key={b} className="group flex items-center gap-2 text-[18px] font-medium text-mute transition hover:text-fg">
                <BrandIcon name={b} className="size-6 grayscale transition group-hover:grayscale-0" />
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Problem, as one statement */}
        <section className="py-28">
          <p className="max-w-4xl text-[30px] leading-[1.25] font-semibold tracking-tight text-faint sm:text-[44px]">
            <span className="text-fg">Four teammates. A dozen agents. One repo.</span> Without coordination they{' '}
            <Word step="block">overwrite each other</Word>, <Word step="handoff">contradict decisions</Word> and leave
            newcomers <Word step="brief">guessing</Word>. And the <Word step="setup">first hour</Word> goes on making
            the repo and the group chat.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-3 max-w-3xl text-[36px] leading-tight font-semibold tracking-tight sm:text-[52px]">
            Everything a team of agents needs to stay in sync.
          </h2>
          <div className="mt-12">
            <Bento />
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="py-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.35fr]">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>Setup</Eyebrow>
              <h2 className="mt-3 text-[36px] leading-tight font-semibold tracking-tight sm:text-[48px]">
                From zero to building in <Word step="setup">one click</Word>.
              </h2>
              <p className="mt-5 text-[18px] leading-relaxed text-mute">
                Sign in with GitHub. Phalanx creates the repo, invites your team, opens the channel and hands every
                agent its config.
              </p>
              <div className="mt-7 flex items-center gap-4 text-fg">
                <BrandIcon name="github" className="size-7" />
                <BrandIcon name="discord" className="size-7" />
                <BrandIcon name="slack" className="size-7" />
                <BrandIcon name="mongodb" className="size-7" />
                <BrandIcon name="mcp" className="size-7" />
              </div>
            </div>
            <Setup onDone={() => document.getElementById('demo')?.scrollIntoView()} />
          </div>
        </section>

        {/* Why MongoDB */}
        <section id="mongodb" className="py-24">
          <div className="flex items-center gap-2">
            <BrandIcon name="mongodb" className="size-5" />
            <Eyebrow>Why MongoDB</Eyebrow>
          </div>
          <h2 className="mt-3 max-w-3xl text-[36px] leading-tight font-semibold tracking-tight sm:text-[52px]">
            One Atlas cluster does all the coordinating.
          </h2>
          <p className="mt-4 max-w-2xl text-[18px] text-mute">No Redis, no message broker, no separate vector database.</p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
            {MONGO.map(([feature, job, step]) => {
              const color = step ? STORY[step].color : '#a1a3a9'
              return (
                <div key={feature} className="bg-ink p-7">
                  <span className="block h-1 w-8 rounded-full" style={{ background: color }} />
                  <div className="mt-5 text-[20px] font-semibold tracking-tight">{feature}</div>
                  <div className="mt-1.5 text-[16px] leading-relaxed text-mute">{job}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 text-center">
          <h2 className="mx-auto max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-[64px]">
            Build together. Never collide.
          </h2>
          <div className="mt-9 flex items-center justify-center gap-3 text-[16px]">
            <a href="#setup" className="rounded-full bg-fg px-6 py-3 font-medium text-ink hover:bg-white">
              Set up your team
            </a>
            <a href={DASHBOARD_HREF} className="rounded-full border border-white/12 px-6 py-3 text-fg hover:bg-white/5">
              Open the dashboard
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-edge py-10">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-3 px-4 text-[14px] text-faint sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <Logo />
            Phalanx
          </span>
          <span className="flex items-center gap-2">
            <BrandIcon name="mongodb" className="size-4" />
            Built at MongoDB Student Builder Day, Dublin
          </span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return VIEW === 'dashboard' ? <Dashboard /> : <Landing />
}
