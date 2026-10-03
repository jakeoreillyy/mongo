import { useEffect, useReducer, useState } from 'react'
import { IS_LIVE, connectLive, connectMock } from './source'
import type { Briefing, Claim, Conflict, Decision, PhalanxEvent, Warning } from './types'

export type FeedItem = { id: number; at: string; event: PhalanxEvent }

export type AgentState = {
  id: string
  status: 'working' | 'blocked' | 'waiting' | 'woken' | 'idle' | 'joining'
  resource?: string
  lastSeen: string
}

export type State = {
  claims: Record<string, Claim>
  agents: Record<string, AgentState>
  feed: FeedItem[]
  decisions: Decision[]
  blockedCount: number
  alert: (Conflict & { key: number }) | null
  warning: (Warning & { key: number }) | null
  waiters: Record<string, string[]>
  briefing: { agentId: string; briefing: Briefing; key: number } | null
}

const empty: State = {
  claims: {},
  agents: {},
  feed: [],
  decisions: [],
  blockedCount: 0,
  alert: null,
  warning: null,
  waiters: {},
  briefing: null,
}

let seq = 0

function touch(state: State, id: string, patch: Partial<AgentState>, at: string): State['agents'] {
  const prev = state.agents[id] ?? { id, status: 'idle', lastSeen: at }
  return { ...state.agents, [id]: { ...prev, ...patch, lastSeen: at } }
}

const withoutWaiter = (waiters: State['waiters'], resource: string, agentId: string) => ({
  ...waiters,
  [resource]: (waiters[resource] ?? []).filter((a) => a !== agentId),
})

function reducer(state: State, event: PhalanxEvent | { type: 'dismiss' } | { type: 'dismiss-warning' }): State {
  if (event.type === 'dismiss') return { ...state, alert: null }
  if (event.type === 'dismiss-warning') return { ...state, warning: null }

  const at = ('createdAt' in event && event.createdAt) || new Date().toISOString()
  const feed = (): FeedItem[] => [{ id: ++seq, at, event }, ...state.feed].slice(0, 40)

  switch (event.type) {
    case 'reset': {
      const claims = Object.fromEntries((event.claims ?? []).map((c) => [c.resource, c]))
      const agents: State['agents'] = {}
      for (const c of event.claims ?? []) {
        agents[c.agentId] = { id: c.agentId, status: 'working', resource: c.resource, lastSeen: c.createdAt }
      }
      return { ...empty, claims, agents }
    }
    case 'claimed': {
      const { type: _, similarTo: __, ...claim } = event
      return {
        ...state,
        claims: { ...state.claims, [claim.resource]: claim },
        waiters: withoutWaiter(state.waiters, claim.resource, claim.agentId),
        agents: touch(state, claim.agentId, { status: 'working', resource: claim.resource }, at),
        feed: feed(),
      }
    }
    case 'released': {
      const { [event.resource]: _, ...claims } = state.claims
      return {
        ...state,
        claims,
        agents: touch(state, event.agentId, { status: 'idle', resource: undefined }, at),
        feed: feed(),
      }
    }
    case 'blocked': {
      const { type: _, ...conflict } = event
      return {
        ...state,
        agents: touch(state, event.agentId, { status: 'blocked', resource: event.resource }, at),
        blockedCount: state.blockedCount + 1,
        alert: { ...conflict, key: ++seq },
        feed: feed(),
      }
    }
    case 'waiting':
      return {
        ...state,
        waiters: { ...state.waiters, [event.resource]: [...(state.waiters[event.resource] ?? []), event.agentId] },
        agents: touch(state, event.agentId, { status: 'waiting', resource: event.resource }, at),
        feed: feed(),
      }
    case 'woken':
      return {
        ...state,
        waiters: withoutWaiter(state.waiters, event.resource, event.agentId),
        agents: touch(state, event.agentId, { status: 'woken', resource: event.resource }, at),
        feed: feed(),
      }
    case 'warning': {
      const { type: _, ...warning } = event
      return {
        ...state,
        warning: { ...warning, key: ++seq },
        agents: touch(state, event.agentId, {}, at),
        feed: feed(),
      }
    }
    case 'decision': {
      const { type: _, ...decision } = event
      return {
        ...state,
        decisions: [decision, ...state.decisions],
        agents: touch(state, event.agentId, {}, at),
        feed: feed(),
      }
    }
    case 'briefing':
      return {
        ...state,
        agents: touch(state, event.agentId, { status: 'joining' }, at),
        briefing: { agentId: event.agentId, briefing: event.briefing, key: ++seq },
        feed: feed(),
      }
  }
}

export function usePhalanx() {
  const [state, dispatch] = useReducer(reducer, empty)
  const [connected, setConnected] = useState(false)

  useEffect(() => (IS_LIVE ? connectLive : connectMock)(dispatch, setConnected), [])

  useEffect(() => {
    if (!state.alert) return
    const t = setTimeout(() => dispatch({ type: 'dismiss' }), 4200)
    return () => clearTimeout(t)
  }, [state.alert])

  useEffect(() => {
    if (!state.warning) return
    const t = setTimeout(() => dispatch({ type: 'dismiss-warning' }), 6000)
    return () => clearTimeout(t)
  }, [state.warning])

  return { state, connected, dispatch }
}

export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
