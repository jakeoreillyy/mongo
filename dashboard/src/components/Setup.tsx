import { type ReactNode, useState } from 'react'
import type { Brand } from '../brands'
import { BrandIcon } from './BrandIcon'

// Simulated onboarding: nothing here calls GitHub, Discord or Slack. It shows
// the flow a team would go through, then hands off to the coordination demo.

type Chat = 'discord' | 'slack'
type Phase = 'form' | 'running' | 'done'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-team'

function Check({ state }: { state: 'todo' | 'doing' | 'done' }) {
  if (state === 'done')
    return (
      <span className="grid size-5 place-items-center rounded-full bg-setup/15 text-setup">
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  if (state === 'doing')
    return <span className="size-5 animate-spin rounded-full border-2 border-setup/20 border-t-setup" />
  return <span className="size-5 rounded-full border border-line" />
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[15px] text-mute">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

const input =
  'w-full rounded-md border border-line bg-ink px-3.5 py-2.5 text-[16px] text-fg outline-none placeholder:text-faint focus:border-setup/60'

export function Setup({ onDone }: { onDone: () => void }) {
  const [team, setTeam] = useState('Night Owls')
  const [people, setPeople] = useState('alex, sam, jo, priya')
  const [chat, setChat] = useState<Chat>('discord')
  const [phase, setPhase] = useState<Phase>('form')
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)

  const slug = slugify(team)
  const members = people.split(',').map((p) => p.trim()).filter(Boolean)
  const chatName = chat === 'discord' ? 'Discord' : 'Slack'

  const tasks: [Brand, string][] = [
    ['github', `Create GitHub repo ${slug}/hackathon`],
    ['github', `Add ${members.length} teammates as collaborators`],
    [chat, `Create ${chatName} channel #${slug}`],
    ['mongodb', 'Create a shared team space in MongoDB Atlas'],
    ['mcp', 'Generate an agent config for each teammate'],
  ]

  const run = () => {
    setPhase('running')
    setStep(0)
    tasks.forEach((_, i) => setTimeout(() => setStep(i + 1), 650 * (i + 1)))
    setTimeout(() => setPhase('done'), 650 * tasks.length + 300)
  }

  const config = JSON.stringify(
    {
      mcpServers: {
        // Same shape as .mcp.json on branch-b.
        phalanx: {
          type: 'stdio',
          command: 'npx',
          args: ['tsx', 'mcp-server/src/mcp-server.ts'],
          env: { API_BASE_URL: 'http://localhost:4000', TEAM_ID: slug },
        },
      },
    },
    null,
    2,
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the config is visible to copy by hand.
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-setup/30 bg-panel text-left shadow-[0_30px_80px_rgb(0_0_0/0.35)]">
      <div className="flex items-center justify-between border-b border-edge px-6 py-4 text-[15px]">
        <span className="flex items-center gap-2 font-medium text-setup">
          <span className="grid size-5 place-items-center rounded-full bg-setup text-[11px] font-semibold text-ink">1</span>
          Set up your team
        </span>
        <span className="text-faint">
          {phase === 'form' ? 'Takes one click' : phase === 'running' ? 'Setting up…' : 'Ready'}
        </span>
      </div>

      {phase === 'form' && (
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Team name">
            <input className={input} value={team} onChange={(e) => setTeam(e.target.value)} />
          </Field>
          <Field label="Teammates (GitHub usernames)">
            <input className={input} value={people} onChange={(e) => setPeople(e.target.value)} />
          </Field>
          <Field label="Team chat">
            <div className="flex rounded-md border border-line p-0.5 text-[15px]">
              {(['discord', 'slack'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChat(c)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 capitalize transition ${
                    chat === c ? 'bg-setup/15 text-fg' : 'text-mute grayscale hover:text-fg'
                  }`}
                >
                  <BrandIcon name={c} className="size-4" />
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Repository">
            <div className={`${input} flex items-center gap-2 text-mute`}>
              <BrandIcon name="github" className="size-4 text-fg" />
              github.com/{slug}/hackathon
            </div>
          </Field>
          <div className="sm:col-span-2">
            <button
              onClick={run}
              className="w-full rounded-md bg-setup px-4 py-3 text-[16px] font-semibold text-ink transition hover:brightness-110"
            >
              Set up team
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <ul className="space-y-3 p-5 sm:p-6">
          {tasks.map(([brand, t], i) => (
            <li key={t} className={`flex items-center gap-3 text-[16px] ${i <= step ? 'text-fg' : 'text-faint opacity-60'}`}>
              <Check state={i < step ? 'done' : i === step ? 'doing' : 'todo'} />
              <BrandIcon name={brand} className="size-5" />
              {t}
            </li>
          ))}
        </ul>
      )}

      {phase === 'done' && (
        <div className="enter grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <div className="text-[24px] font-semibold tracking-tight">{team} is ready.</div>
            <p className="mt-1 text-[16px] text-mute">Everyone is invited. Paste the config into your agent.</p>
            <ul className="mt-5 divide-y divide-edge rounded-lg border border-edge text-[15px]">
              <li className="flex justify-between gap-3 px-3 py-2.5">
                <span className="flex items-center gap-2 text-mute"><BrandIcon name="github" className="size-4 text-fg" />Repository</span>
                <span className="font-mono text-fg">{slug}/hackathon</span>
              </li>
              <li className="flex justify-between gap-3 px-3 py-2.5">
                <span className="flex items-center gap-2 text-mute"><BrandIcon name={chat} className="size-4" />{chatName}</span>
                <span className="font-mono text-fg">#{slug}</span>
              </li>
              <li className="flex justify-between gap-3 px-3 py-2.5">
                <span className="text-mute">Teammates</span>
                <span className="truncate text-fg">{members.join(', ')}</span>
              </li>
            </ul>
            <button
              onClick={onDone}
              className="mt-5 w-full rounded-md bg-setup px-4 py-3 text-[16px] font-semibold text-ink transition hover:brightness-110"
            >
              Watch your agents work →
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between text-[15px]">
              <span className="flex items-center gap-2 text-mute">
                Agent config for
                <BrandIcon name="claude" className="size-4" />
                <BrandIcon name="cursor" className="size-4 text-fg" />
                <BrandIcon name="windsurf" className="size-4 text-fg" />
              </span>
              <button onClick={copy} className="rounded border border-line px-2 py-0.5 text-[12px] text-fg hover:bg-white/5">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-edge bg-ink p-4 font-mono text-[13px] leading-6 text-mute">
              {config}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
