// Shapes follow the HTTP contract in PHALANX-SPLIT.md. The contract doesn't fix
// a time format: B's stub sends epoch ms, Mongo docs serialise to ISO strings.
export type Time = string | number

export type Claim = {
  _id?: string
  teamId: string
  resource: string
  agentId: string
  task: string
  createdAt: Time
  expiresAt: Time
}

export type Decision = {
  id?: string
  teamId: string
  module: string
  agentId: string
  text: string
  createdAt: Time
}

export type Conflict = {
  teamId: string
  resource: string
  agentId: string
  heldBy: string
  task?: string
  createdAt: Time
}

export type Briefing = {
  claims: Claim[]
  decisions: Decision[]
}

// A claim that went through but overlaps a held one (Vector Search). The
// contract only says `similarTo`, so accept a resource name or a claim.
export type Warning = {
  teamId: string
  resource: string
  agentId: string
  similarTo: string | Pick<Claim, 'resource' | 'agentId'>
  createdAt: Time
}

export type Waiter = {
  teamId: string
  resource: string
  agentId: string
  createdAt: Time
}

export const similarResource = (w: Warning) => (typeof w.similarTo === 'string' ? w.similarTo : w.similarTo.resource)

// What /events pushes, plus two dashboard-only events the mock replay uses.
export type PhalanxEvent =
  | ({ type: 'claimed' } & Claim & { similarTo?: Warning['similarTo'] })
  | ({ type: 'warning' } & Warning)
  | ({ type: 'waiting' } & Waiter)
  | ({ type: 'woken' } & Waiter)
  // A change stream delete only carries _id unless pre-images are enabled,
  // so resource and agentId may be missing.
  | { type: 'released'; _id?: string; teamId?: string; resource?: string; agentId?: string; createdAt?: Time }
  | ({ type: 'blocked' } & Conflict)
  | ({ type: 'decision' } & Decision)
  | { type: 'briefing'; agentId: string; briefing: Briefing }
  | { type: 'reset'; claims?: Claim[] }
