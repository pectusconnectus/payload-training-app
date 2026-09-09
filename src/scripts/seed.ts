/**
 * Imports sample data from seed-data.json into a clean database.
 * Order: exercises → plans → microcycles → workouts → workout-groups → workout-exercise-rows
 *
 * Safe to run repeatedly against an empty database.
 * On a non-empty database it duplicates data — run it only on a fresh install.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT = path.resolve(dirname, '../data/seed-data.json')

type SeedData = {
  exportedAt: string
  exercises: Record<string, unknown>[]
  plans: Record<string, unknown>[]
  microcycles: Record<string, unknown>[]
  workouts: Record<string, unknown>[]
  workoutGroups: Record<string, unknown>[]
  workoutExerciseRows: Record<string, unknown>[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(obj: Record<string, unknown>, keys: string[]): any {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))
}

async function run() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Missing seed-data.json file: ${INPUT}`)
    console.error('Run `yarn seed:export` first.')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const data: SeedData = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))

  payload.logger.info(`Seeding from the export made on ${data.exportedAt}`)

  // ─── exercises ─────────────────────────────────────────────────────────────
  const exerciseIdMap = new Map<string | number, string | number>()

  for (const ex of data.exercises) {
    const created = await payload.create({
      collection: 'exercises',
      data: pick(ex, ['name', 'trackingType', 'description', 'videoUrl', 'muscleGroup', 'equipment']),
    })
    exerciseIdMap.set(ex.id as string | number, created.id)
  }
  payload.logger.info(`  exercises: ${exerciseIdMap.size}`)

  // ─── plans (bez client) ────────────────────────────────────────────────────
  const planIdMap = new Map<string | number, string | number>()

  for (const plan of data.plans) {
    const created = await payload.create({
      collection: 'plans',
      data: pick(plan, ['title', 'status', 'startDate', 'endDate', 'description', 'source']),
    })
    planIdMap.set(plan.id as string | number, created.id)
  }
  payload.logger.info(`  plans: ${planIdMap.size}`)

  // ─── microcycles ───────────────────────────────────────────────────────────
  const microcycleIdMap = new Map<string | number, string | number>()

  for (const mc of data.microcycles) {
    const newPlanId = planIdMap.get(mc.plan as string | number)
    if (!newPlanId) {
      payload.logger.warn(`Skipped microcycle ${mc.id} — missing plan ${mc.plan}`)
      continue
    }
    const created = await payload.create({
      collection: 'microcycles',
      data: {
        ...pick(mc, ['title', 'rpe', 'order']),
        plan: newPlanId,
      },
    })
    microcycleIdMap.set(mc.id as string | number, created.id)
  }
  payload.logger.info(`  microcycles: ${microcycleIdMap.size}`)

  // ─── workouts ──────────────────────────────────────────────────────────────
  const workoutIdMap = new Map<string | number, string | number>()

  for (const wo of data.workouts) {
    const newMicrocycleId = microcycleIdMap.get(wo.microcycle as string | number)
    if (!newMicrocycleId) {
      payload.logger.warn(`Skipped workout ${wo.id} — missing microcycle ${wo.microcycle}`)
      continue
    }
    const created = await payload.create({
      collection: 'workouts',
      data: {
        ...pick(wo, ['title', 'rpe', 'order', 'sections']),
        microcycle: newMicrocycleId,
      },
    })
    workoutIdMap.set(wo.id as string | number, created.id)
  }
  payload.logger.info(`  workouts: ${workoutIdMap.size}`)

  // ─── workout-groups ────────────────────────────────────────────────────────
  // Sections get new row-ids once the workout is saved, so they have to be remapped.
  // Strategy: map sectionRowIds by their order within each workout.
  const sectionRowIdMap = new Map<string, string>()

  for (const wo of data.workouts) {
    const newWorkoutId = workoutIdMap.get(wo.id as string | number)
    if (!newWorkoutId) continue

    const savedWorkout = await payload.findByID({
      collection: 'workouts',
      id: newWorkoutId,
      depth: 0,
    })
    const oldSections = (wo.sections as Array<{ id?: string }>) ?? []
    const newSections = (savedWorkout.sections as Array<{ id?: string }>) ?? []

    oldSections.forEach((oldSec, idx) => {
      if (oldSec.id && newSections[idx]?.id) {
        sectionRowIdMap.set(oldSec.id, newSections[idx].id!)
      }
    })
  }

  const groupIdMap = new Map<string | number, string | number>()

  for (const wg of data.workoutGroups) {
    const newWorkoutId = workoutIdMap.get(wg.workout as string | number)
    if (!newWorkoutId) {
      payload.logger.warn(`Skipped group ${wg.id} — missing workout ${wg.workout}`)
      continue
    }
    const oldSectionRowId = wg.sectionRowId as string | undefined
    const newSectionRowId = oldSectionRowId ? (sectionRowIdMap.get(oldSectionRowId) ?? oldSectionRowId) : undefined

    const created = await payload.create({
      collection: 'workout-groups',
      data: {
        ...pick(wg, [
          'label', 'order', 'protocol', 'rounds',
          'durationMinutes', 'intervalSeconds', 'workSeconds',
          'restSeconds', 'restBetweenRounds',
        ]),
        workout: newWorkoutId,
        sectionRowId: newSectionRowId,
      },
    })
    groupIdMap.set(wg.id as string | number, created.id)
  }
  payload.logger.info(`  workout-groups: ${groupIdMap.size}`)

  // ─── workout-exercise-rows ─────────────────────────────────────────────────
  let rowCount = 0

  for (const row of data.workoutExerciseRows) {
    const newGroupId = groupIdMap.get(row.group as string | number)
    if (!newGroupId) {
      payload.logger.warn(`Skipped row ${row.id} — missing group ${row.group}`)
      continue
    }
    const oldExerciseId = row.exercise as string | number | null | undefined
    const newExerciseId = oldExerciseId != null ? exerciseIdMap.get(oldExerciseId) : undefined

    await payload.create({
      collection: 'workout-exercise-rows',
      data: {
        ...pick(row, [
          'order', 'numer', 'note',
          'rounds', 'reps', 'repsLeft', 'repsRight', 'kg',
          'tut', 'rir', 'rest',
          'durationMin', 'durationSec',
          'setParameters', 'override',
        ]),
        group: newGroupId,
        ...(newExerciseId != null ? { exercise: newExerciseId } : {}),
      },
    })
    rowCount++
  }
  payload.logger.info(`  workout-exercise-rows: ${rowCount}`)

  payload.logger.info('\nSeed completed successfully.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
