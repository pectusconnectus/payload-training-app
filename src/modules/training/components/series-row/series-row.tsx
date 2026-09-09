'use client'

import React, { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { joinClasses, panelClass } from '@/lib/class-names'
import { Button } from '@/components/ui/button'
import { SeriesForm } from '@/modules/training/components/series-form'
import type { MetricField } from '@/modules/training/exercises'
import type { SetLog } from '@/payload-types'
import {
  formatSetLogSummary,
  toMetricFormValues,
  type MetricFormValues,
} from '@/modules/training/logs'

export function SeriesRow({
  set,
  fields,
  onUpdate,
  onDelete,
  readOnly,
}: {
  set: SetLog
  fields: MetricField[]
  onUpdate: (values: MetricFormValues) => Promise<void>
  onDelete: () => Promise<void>
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li className={`mb-1 px-2.5 py-2 ${joinClasses(panelClass, 'rounded-lg bg-ui-bg-base')}`}>
        <SeriesForm
          fields={fields}
          initial={toMetricFormValues(set, fields)}
          onSubmit={async (values) => {
            await onUpdate(values)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="mb-1 flex items-center justify-between gap-2 rounded-lg border border-ui-border-base bg-ui-bg-base px-2.5 py-1.5 text-sm">
      <span>
        Set {set.setNumber}: {formatSetLogSummary(set)}
      </span>
      {!readOnly && (
        <span className="flex shrink-0 gap-0.5">
          <Button variant="icon" onClick={() => setEditing(true)} aria-label="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete} aria-label="Delete">
            <Trash2 size={14} />
          </Button>
        </span>
      )}
    </li>
  )
}
