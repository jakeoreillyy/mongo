// One colour per step of the story, used everywhere on the page. Colour means
// "which step" and nothing else.
export const STORY = {
  setup: { label: 'Set up', color: '#5b9cf5' },
  claim: { label: 'Claim', color: '#3ecf8e' },
  block: { label: 'Block', color: '#f2555a' },
  warn: { label: 'Warn', color: '#f5b14c' },
  handoff: { label: 'Hand off', color: '#a78bfa' },
  brief: { label: 'Brief', color: '#4cc9f0' },
} as const

export type StoryStep = keyof typeof STORY

export const EVENT_STEP = {
  claimed: 'claim',
  blocked: 'block',
  waiting: 'block',
  warning: 'warn',
  decision: 'handoff',
  released: 'handoff',
  woken: 'handoff',
  briefing: 'brief',
} as const satisfies Record<string, StoryStep>

// Soft tinted background and border for a step colour.
export const tint = (hex: string, bg = 0.1, border = 0.35) => ({
  background: `${hex}${Math.round(bg * 255).toString(16).padStart(2, '0')}`,
  borderColor: `${hex}${Math.round(border * 255).toString(16).padStart(2, '0')}`,
})
