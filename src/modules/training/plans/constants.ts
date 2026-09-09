import type { WorkoutProtocol } from './types'

export const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
}

export const PROTOCOL_LABEL: Record<WorkoutProtocol, string> = {
  standard: 'Standard',
  emom: 'EMOM',
  amrap: 'AMRAP',
  for_time: 'For Time',
  tabata: 'Tabata',
}

export const PROTOCOL_OPTIONS = (Object.keys(PROTOCOL_LABEL) as WorkoutProtocol[]).map((value) => ({
  value,
  label: PROTOCOL_LABEL[value],
}))
