import type { Briefing, Claim, Decision, PhalanxEvent } from './types'

export const TEAM_ID = import.meta.env.VITE_TEAM_ID ?? 'demo'
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'
export const IS_LIVE = new URLSearchParams(location.search).has('live')

type Emit = (event: PhalanxEvent) => void
type Status = (connected: boolean) => void

// Live: seed from GET /claims, then follow the change stream over SSE.
export function connectLive(emit: Emit, onStatus: Status): () => void {
  let source: EventSource | null = null
  let closed = false

  fetch(`${API_URL}/claims?teamId=${TEAM_ID}`)
    .then((res) => res.json() as Promise<Claim[]>)
    .then((claims) => !closed && emit({ type: 'reset', claims }))
    .catch(() => onStatus(false))

  source = new EventSource(`${API_URL}/events?teamId=${TEAM_ID}`)
  source.onopen = () => onStatus(true)
  source.onerror = () => onStatus(false)
  source.onmessage = (msg) => {
    try {
      emit(JSON.parse(msg.data) as PhalanxEvent)
    } catch {
      // Ignore keepalives and anything that is not JSON.
    }
  }

  return () => {
    closed = true
    source?.close()
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

  onStatus(true)
  run()
  return () => timers.forEach(clearTimeout)
}
