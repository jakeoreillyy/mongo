import type { Briefing, Claim, Decision, PhalanxEvent } from './types'

export const TEAM_ID = import.meta.env.VITE_TEAM_ID ?? 'demo'
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'
export const IS_LIVE = new URLSearchParams(location.search).has('live')

type Emit = (event: PhalanxEvent) => void
export type Via = 'stream' | 'polling' | 'replay'
type Status = (connected: boolean, via?: Via) => void

const POLL_MS = 1000

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json()
}

const decisionKey = (d: Decision & { _id?: string }) => d.id ?? d._id ?? `${d.agentId}|${d.createdAt}|${d.text}`

// Live: follow the change stream over SSE. Until /events is open, or whenever
// it drops, poll /claims and /briefing and diff them into the same events.
// Polling cannot see rejected claims, warnings or waiters; only the stream can.
export function connectLive(emit: Emit, onStatus: Status): () => void {
  let closed = false
  let streaming = false
  let seeded = false
  let timer: number | undefined
  let held = new Map<string, Claim>()
  const seen = new Set<string>()

  const poll = async () => {
    const [claims, briefing] = await Promise.allSettled([
      getJson<Claim[]>(`/claims?teamId=${TEAM_ID}`),
      getJson<Briefing>(`/briefing?teamId=${TEAM_ID}`),
    ])
    if (closed || streaming) return
    if (claims.status === 'rejected') return onStatus(false)

    const next = new Map(claims.value.map((c) => [c.resource, c]))
    const decisions = () => {
      if (briefing.status === 'fulfilled') {
        // The briefing lists newest first; replay unseen ones oldest first.
        for (const d of [...briefing.value.decisions].reverse()) {
          const k = decisionKey(d)
          if (!seen.has(k)) {
            seen.add(k)
            emit({ type: 'decision', ...d })
          }
        }
      }
    }
    if (!seeded) {
      emit({ type: 'reset', claims: claims.value })
      seeded = true
      decisions()
    } else {
      decisions()
      for (const [resource, c] of held) {
        if (next.get(resource)?.agentId !== c.agentId) {
          emit({ type: 'released', teamId: TEAM_ID, resource, agentId: c.agentId, createdAt: Date.now() })
        }
      }
      for (const [resource, c] of next) {
        if (held.get(resource)?.agentId !== c.agentId) emit({ type: 'claimed', ...c })
      }
    }
    held = next

    onStatus(true, 'polling')
  }

  const startPolling = () => {
    if (timer !== undefined) return
    seeded = false
    seen.clear()
    poll()
    timer = window.setInterval(poll, POLL_MS)
  }
  const stopPolling = () => {
    window.clearInterval(timer)
    timer = undefined
  }

  startPolling()

  const source = new EventSource(`${API_URL}/events?teamId=${TEAM_ID}`)
  source.onopen = () => {
    streaming = true
    stopPolling()
    onStatus(true, 'stream')
  }
  source.onerror = () => {
    // EventSource keeps retrying on its own; poll in the meantime.
    streaming = false
    startPolling()
  }
  source.onmessage = (msg) => {
    try {
      emit(JSON.parse(msg.data) as PhalanxEvent)
    } catch {
      // Ignore keepalives and anything that is not JSON.
    }
  }

  return () => {
    closed = true
    stopPolling()
    source.close()
  }
}

export async function fetchBriefing(): Promise<Briefing> {
  const res = await fetch(`${API_URL}/briefing?teamId=${TEAM_ID}`)
  return res.json()
}

// Where the mock replay is in its loop, so the landing page can show progress.
export const replay = { start: 0, total: 1 }

// Mock: replays B's scripted demo on a loop so the dashboard can be built and
// rehearsed with no backend.
const TTL_SECONDS = 90

export function connectMock(emit: Emit, onStatus: Status): () => void {
  const timers: number[] = []
  const claims = new Map<string, Claim>()
  const decisions: Decision[] = []

  const now = () => new Date().toISOString()
  const claim = (agentId: string, resource: string, task: string): PhalanxEvent => {
    const c: Claim = {
      teamId: TEAM_ID,
      resource,
      agentId,
      task,
      createdAt: now(),
      expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
    }
    claims.set(resource, c)
    return { type: 'claimed', ...c }
  }

  const waiter = (type: 'waiting' | 'woken', agentId: string, resource: string): PhalanxEvent => ({
    type,
    teamId: TEAM_ID,
    resource,
    agentId,
    createdAt: now(),
  })

  // Follows the demo in PHALANX-SPLIT.md: block and wait, soft warning,
  // release wakes the waiter, then a fresh agent is briefed.
  const script: [number, () => PhalanxEvent][] = [
    [1500, () => claim('agent-1', 'auth', 'Refactor login flow')],
    [2500, () => claim('agent-2', 'payments', 'Add Stripe webhooks')],
    [3000, () => {
      const holder = claims.get('auth')!
      return {
        type: 'blocked',
        teamId: TEAM_ID,
        resource: 'auth',
        agentId: 'agent-2',
        heldBy: holder.agentId,
        task: holder.task,
        createdAt: now(),
      }
    }],
    [3000, () => waiter('waiting', 'agent-2', 'auth')],
    [3000, () => claim('agent-3', 'login-flow', 'Add magic-link sign in')],
    [1800, () => ({
      type: 'warning',
      teamId: TEAM_ID,
      resource: 'login-flow',
      agentId: 'agent-3',
      similarTo: { resource: 'auth', agentId: 'agent-1' },
      createdAt: now(),
    })],
    [3800, () => {
      const d: Decision = {
        teamId: TEAM_ID,
        module: 'auth',
        agentId: 'agent-1',
        text: 'Auth uses JWT, not sessions',
        createdAt: now(),
      }
      decisions.unshift(d)
      return { type: 'decision', ...d }
    }],
    [2800, () => {
      claims.delete('auth')
      return { type: 'released', teamId: TEAM_ID, resource: 'auth', agentId: 'agent-1', createdAt: now() }
    }],
    [1400, () => waiter('woken', 'agent-2', 'auth')],
    [1800, () => claim('agent-2', 'auth', 'Hook payments into auth')],
    [3200, () => ({
      type: 'briefing',
      agentId: 'agent-4',
      briefing: { claims: [...claims.values()], decisions: decisions.slice(0, 10) },
    })],
  ]

  const run = () => {
    claims.clear()
    decisions.length = 0
    emit({ type: 'reset' })
    let at = 0
    for (const [delay, step] of script) {
      at += delay
      timers.push(window.setTimeout(() => emit(step()), at))
    }
    replay.start = Date.now()
    replay.total = at + 9000
    timers.push(window.setTimeout(run, at + 9000))
  }

  onStatus(true, 'replay')
  run()
  return () => timers.forEach(clearTimeout)
}
