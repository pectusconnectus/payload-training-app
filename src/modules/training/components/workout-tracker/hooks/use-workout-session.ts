'use client'

import { useEffect, useRef, useState } from 'react'
import { sdk } from '@/lib/sdk'
import type { MetricField } from '@/modules/training/exercises'
import {
  getExerciseName,
  type WorkoutExerciseTree,
  type WorkoutTree,
} from '@/modules/training/plans'
import { toSetLogMetricData, type MetricFormValues } from '@/modules/training/logs'
import type { ExerciseLog, SetLog, WorkoutLog } from '@/payload-types'

const relationshipId = (
  relationship: number | { id: number } | null | undefined,
): number | null =>
  relationship && typeof relationship === 'object' ? relationship.id : (relationship ?? null)

export function useWorkoutSession(
  workout: WorkoutTree,
  options: { readOnly?: boolean; showResults?: boolean },
) {
  const { readOnly, showResults } = options

  const [session, setSession] = useState<WorkoutLog | null>(null)
  const [sets, setSets] = useState<SetLog[]>([])
  const [exerciseNotes, setExerciseNotes] = useState<ExerciseLog[]>([])
  const [loadedWorkoutId, setLoadedWorkoutId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasLoaded = loadedWorkoutId === workout.id
  const displayedSession = hasLoaded ? session : null
  const displayedSets = hasLoaded ? sets : []
  const displayedNotes = hasLoaded ? exerciseNotes : []

  useEffect(() => {
    if (readOnly && !showResults) return
    let active = true

    sdk
      .find({ collection: 'workout-logs', where: { workout: { equals: workout.id } }, limit: 1, depth: 0, sort: '-updatedAt' })
      .then(async (result) => {
        if (!active) return
        const loadedSession = result.docs[0] ?? null

        if (!loadedSession) {
          setSession(null)
          setSets([])
          setExerciseNotes([])
          setLoadedWorkoutId(workout.id)
          return
        }

        setSession(loadedSession)
        const [setsResult, notesResult] = await Promise.all([
          sdk.find({
            collection: 'set-logs',
            where: { session: { equals: loadedSession.id } },
            limit: 500,
            depth: 0,
            sort: 'setNumber',
          }),
          sdk.find({
            collection: 'exercise-logs',
            where: { session: { equals: loadedSession.id } },
            limit: 500,
            depth: 0,
          }),
        ])
        if (!active) return

        setSets(setsResult.docs)
        setExerciseNotes(notesResult.docs)
        setLoadedWorkoutId(workout.id)
      })
      .catch((loadError) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Could not load the session')
        setLoadedWorkoutId(workout.id)
      })

    return () => {
      active = false
    }
  }, [workout.id, readOnly, showResults])

  const runMutation = async (fn: () => Promise<void>, fallback: string) => {
    try {
      await fn()
      setError(null)
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : fallback)
    }
  }

  const creating = useRef<Promise<WorkoutLog> | null>(null)
  const ensureSession = async (): Promise<WorkoutLog> => {
    if (displayedSession) return displayedSession
    if (!creating.current) {
      creating.current = sdk
        .create({ collection: 'workout-logs', data: { workout: workout.id } })
        .then((doc) => {
          setSession(doc)
          setLoadedWorkoutId(workout.id)
          return doc
        })
    }
    return creating.current
  }

  const setsForRow = (rowId: number) =>
    displayedSets
      .filter((set) => relationshipId(set.exerciseRow) === rowId)
      .sort(
        (firstSet, secondSet) => (firstSet.setNumber ?? 0) - (secondSet.setNumber ?? 0),
      )

  const noteForRow = (rowId: number): string =>
    displayedNotes.find((entry) => relationshipId(entry.exerciseRow) === rowId)?.note ?? ''

  const setTime = (field: 'startedAt' | 'finishedAt', iso: string | null) =>
    runMutation(async () => {
      const s = await ensureSession()
      const doc = await sdk.update({ collection: 'workout-logs', id: s.id, data: { [field]: iso } })
      setSession(doc)
    }, 'Could not save the time')

  const saveTimes = (startedAt: string | null, finishedAt: string | null) =>
    runMutation(async () => {
      const s = await ensureSession()
      const doc = await sdk.update({
        collection: 'workout-logs',
        id: s.id,
        data: { startedAt, finishedAt },
      })
      setSession(doc)
    }, 'Could not save the time')

  const addSet = (
    exercise: WorkoutExerciseTree,
    fields: MetricField[],
    values: MetricFormValues,
  ) =>
    runMutation(async () => {
      const s = await ensureSession()
      const setNumber = setsForRow(exercise.id).length + 1
      const exerciseName = getExerciseName(exercise)
      const doc = await sdk.create({
        collection: 'set-logs',
        depth: 0,
        data: {
          session: s.id,
          exercise: exercise.exercise?.id ?? undefined,
          exerciseName,
          exerciseRow: exercise.id,
          setNumber,
          ...toSetLogMetricData(fields, values),
        },
      })
      setSets((prev) => [...prev, doc])
    }, 'Could not save the set')

  const updateSet = (id: number, fields: MetricField[], values: MetricFormValues) =>
    runMutation(async () => {
      const doc = await sdk.update({
        collection: 'set-logs',
        id,
        depth: 0,
        data: toSetLogMetricData(fields, values),
      })
      setSets((prev) =>
        prev.map((set) => (set.id === id ? doc : set)),
      )
    }, 'Could not update the set')

  const deleteSet = (id: number) =>
    runMutation(async () => {
      await sdk.delete({ collection: 'set-logs', id })
      setSets((prev) => prev.filter((set) => set.id !== id))
    }, 'Could not delete the set')

  const saveSessionNote = (note: string) =>
    runMutation(async () => {
      const s = await ensureSession()
      const doc = await sdk.update({
        collection: 'workout-logs',
        id: s.id,
        depth: 0,
        data: { notes: note.trim() },
      })
      setSession(doc)
    }, 'Could not save the note')

  const saveExerciseNote = (exercise: WorkoutExerciseTree, note: string) =>
    runMutation(async () => {
      const s = await ensureSession()
      const rowId = exercise.id
      const exerciseName = getExerciseName(exercise)
      const existing = exerciseNotes.find(
        (entry) => relationshipId(entry.exerciseRow) === rowId,
      )
      const trimmed = note.trim()

      const doc = existing
        ? await sdk.update({
            collection: 'exercise-logs',
            id: existing.id,
            depth: 0,
            data: { note: trimmed },
          })
        : await sdk.create({
            collection: 'exercise-logs',
            depth: 0,
            data: {
              session: s.id,
              exercise: exercise.exercise?.id ?? undefined,
              exerciseName,
              exerciseRow: rowId,
              note: trimmed,
            },
          })

      setExerciseNotes((prev) =>
        existing ? prev.map((entry) => (entry.id === doc.id ? doc : entry)) : [...prev, doc],
      )
    }, 'Could not save the note')

  return {
    session: displayedSession,
    hasLoaded,
    error,
    clearError: () => setError(null),
    setsForRow,
    noteForRow,
    setTime,
    saveTimes,
    addSet,
    updateSet,
    deleteSet,
    saveExerciseNote,
    saveSessionNote,
  }
}
