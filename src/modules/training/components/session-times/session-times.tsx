'use client'

import React, { useState } from 'react'
import { Clock, X } from 'lucide-react'
import { joinClasses, mutedTextClass } from '@/lib/class-names'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { WorkoutLog } from '@/payload-types'
import { combineDateTime, formatDuration, isoToDateInput, isoToTimeInput } from '@/lib/date'

export function SessionTimesBadge({
  session,
  open,
  onOpen,
}: {
  session: WorkoutLog | null
  open: boolean
  onOpen: () => void
}) {
  const startIso = session?.startedAt ?? null
  const finishIso = session?.finishedAt ?? null
  const duration = formatDuration(startIso, finishIso)
  const dateLabel = startIso ? isoToDateInput(startIso).slice(5).replace('-', '.') : null

  const iconClass = open ? 'text-white' : mutedTextClass

  return (
    <Button
      variant="secondary"
      className={joinClasses(
        'rounded-full px-2.5 text-xs font-normal',
        open ? 'border-ui-border-interactive bg-ui-bg-interactive text-white' : 'bg-ui-bg-subtle text-ui-fg-base',
      )}
      onClick={onOpen}
    >
      {open ? (
        <X size={14} strokeWidth={2.5} className={iconClass} />
      ) : dateLabel || duration ? (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {dateLabel && <span>{dateLabel}</span>}
          {duration && <span className="font-bold text-ui-fg-interactive">{duration}</span>}
        </span>
      ) : (
        <Clock size={15} className={iconClass} />
      )}
    </Button>
  )
}

export function SessionTimesForm({
  session,
  onSet,
  onSave,
  onClose,
}: {
  session: WorkoutLog | null
  onSet: (field: 'startedAt' | 'finishedAt', iso: string | null) => void
  onSave: (startedAt: string | null, finishedAt: string | null) => Promise<void>
  onClose: () => void
}) {
  const startIso = session?.startedAt ?? null
  const finishIso = session?.finishedAt ?? null

  const [saving, setSaving] = useState(false)
  const [startDate, setStartDate] = useState(() => isoToDateInput(startIso))
  const [startTime, setStartTime] = useState(() => isoToTimeInput(startIso))
  const [endDate, setEndDate] = useState(() => isoToDateInput(finishIso))
  const [endTime, setEndTime] = useState(() => isoToTimeInput(finishIso))

  const setStartNow = () => {
    const iso = new Date().toISOString()
    setStartDate(isoToDateInput(iso))
    setStartTime(isoToTimeInput(iso))
    onSet('startedAt', iso)
  }

  const addToStart = (hours: number) => {
    const base = combineDateTime(startDate, startTime) ?? new Date().toISOString()
    const iso = new Date(new Date(base).getTime() + hours * 3600 * 1000).toISOString()
    setEndDate(startDate || isoToDateInput(iso))
    setEndTime(isoToTimeInput(iso))
    onSet('finishedAt', combineDateTime(startDate || isoToDateInput(iso), isoToTimeInput(iso)))
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(combineDateTime(startDate, startTime), combineDateTime(endDate || startDate, endTime))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 font-normal">
      <div className="flex flex-col gap-2.5">
        <Field label="Started" className="sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="w-31.5 [&::-webkit-calendar-picker-indicator]:hidden"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              onBlur={() => onSet('startedAt', combineDateTime(startDate, startTime))}
            />
            <Input
              type="time"
              className="w-22 [&::-webkit-calendar-picker-indicator]:hidden"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              onBlur={() => onSet('startedAt', combineDateTime(startDate, startTime))}
            />
            <Button variant="secondary" onClick={setStartNow}>
              now
            </Button>
          </div>
        </Field>

        <Field label="Finished" className="sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              onBlur={() => onSet('finishedAt', combineDateTime(endDate || startDate, endTime))}
            />
            {([1, 1.5, 2] as const).map((hours) => (
              <Button key={hours} variant="secondary" onClick={() => addToStart(hours)}>
                +{hours}h
              </Button>
            ))}
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? '…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
