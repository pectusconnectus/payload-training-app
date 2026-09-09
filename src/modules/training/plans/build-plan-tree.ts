import {
  buildExerciseMeta,
  buildWorkoutGroupMeta,
  formatWorkoutGroupLabel,
} from './formatters'
import { STATUS_LABEL } from './constants'
import type {
  ExerciseMetaLabels,
  PlanDocuments,
  PlanTree,
  WorkoutBlock,
  WorkoutExerciseTree,
  WorkoutGroupTree,
  WorkoutTree,
} from './types'

type Relationship<RelationshipId extends number | string = number | string> =
  | RelationshipId
  | { id: RelationshipId }

const resolveRelationshipId = <RelationshipId extends number | string>(
  relationship: Relationship<RelationshipId>,
): RelationshipId => (typeof relationship === 'object' ? relationship.id : relationship)

const groupByRelationship = <Item>(
  items: Item[],
  getRelationship: (item: Item) => Relationship,
): Map<number | string, Item[]> => {
  const groupedItems = new Map<number | string, Item[]>()

  items.forEach((item) => {
    const relationshipId = resolveRelationshipId(getRelationship(item))
    const relatedItems = groupedItems.get(relationshipId) ?? []
    relatedItems.push(item)
    groupedItems.set(relationshipId, relatedItems)
  })

  return groupedItems
}

export const buildPlanTree = (
  documents: PlanDocuments,
  labels: ExerciseMetaLabels,
): PlanTree[] => {
  const microcyclesByPlan = groupByRelationship(
    documents.microcycles,
    (microcycle) => microcycle.plan,
  )
  const workoutsByMicrocycle = groupByRelationship(
    documents.workouts,
    (workout) => workout.microcycle,
  )
  const groupsByWorkout = groupByRelationship(documents.groups, (group) => group.workout)
  const exerciseRowsByGroup = groupByRelationship(
    documents.exerciseRows,
    (exerciseRow) => exerciseRow.group,
  )

  const buildExerciseTree = (
    exerciseRow: PlanDocuments['exerciseRows'][number],
  ): WorkoutExerciseTree => ({
    ...exerciseRow,
    group: resolveRelationshipId(exerciseRow.group),
    exercise:
      exerciseRow.exercise && typeof exerciseRow.exercise === 'object'
        ? exerciseRow.exercise
        : null,
    meta: buildExerciseMeta(exerciseRow, labels),
  })

  const buildGroupTree = (
    group: PlanDocuments['groups'][number],
  ): WorkoutGroupTree => ({
    ...group,
    protocol: group.protocol ?? 'standard',
    label: group.label ?? '',
    protocolLabel: formatWorkoutGroupLabel(group),
    meta: buildWorkoutGroupMeta(group),
    exercises: (exerciseRowsByGroup.get(group.id) ?? []).map(buildExerciseTree),
  })

  const buildWorkoutTree = (
    workout: PlanDocuments['workouts'][number],
  ): WorkoutTree => {
    const workoutGroups = groupsByWorkout.get(workout.id) ?? []

    return {
      ...workout,
      sections: (workout.sections ?? []).map((section) => {
        const sectionGroups = workoutGroups
          .filter((group) => group.sectionRowId === section.id)
          .sort(
            (firstGroup, secondGroup) =>
              (firstGroup.order ?? 0) - (secondGroup.order ?? 0),
          )
        const blocks: WorkoutBlock[] = []

        sectionGroups.forEach((group, groupIndexInSection) => {
          if (groupIndexInSection === 0 || !group.bundleWithPrevious) {
            blocks.push({ index: blocks.length, groups: [] })
          }

          blocks[blocks.length - 1].groups.push(buildGroupTree(group))
        })

        return {
          ...section,
          blocks,
        }
      }),
    }
  }

  return documents.plans.map((plan) => {
    const status = plan.status ?? 'active'

    return {
      ...plan,
      status,
      statusLabel: STATUS_LABEL[status] || status,
      dateRange:
        plan.startDate || plan.endDate
          ? [plan.startDate, plan.endDate]
              .map((date) => (date ? new Date(date).toLocaleDateString('en-GB') : '...'))
              .join(' - ')
          : null,
      microcycles: (microcyclesByPlan.get(plan.id) ?? []).map((microcycle) => ({
        ...microcycle,
        workouts: (workoutsByMicrocycle.get(microcycle.id) ?? []).map(buildWorkoutTree),
      })),
    }
  })
}
