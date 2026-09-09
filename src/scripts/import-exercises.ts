/**
 * Imports the exercise catalogue in `src/data/exercises-catalog.json` into the
 * `exercises` collection.
 *
 * Safe to run repeatedly: exercises are matched by name (case-insensitively).
 * An existing exercise is left untouched unless --update is passed, and a
 * `videoUrl` that a coach has filled in by hand is never overwritten.
 *
 *   yarn import:exercises            # add what is missing, touch nothing else
 *   yarn import:exercises --update   # also refresh muscle group, equipment
 *                                    # and description on existing rows
 *   yarn import:exercises --dry-run  # report what would happen, write nothing
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT = path.resolve(dirname, '../data/exercises-catalog.json')

type CatalogExercise = {
  name: string
  trackingType: 'strength' | 'cardio'
  muscleGroup: string
  equipment: string
  description: string
}

type Catalog = {
  source: Record<string, string>
  exercises: CatalogExercise[]
}

const UPDATE = process.argv.includes('--update')
const DRY_RUN = process.argv.includes('--dry-run')

async function run() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Missing catalogue file: ${INPUT}`)
    process.exit(1)
  }

  const catalog: Catalog = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))
  const payload = await getPayload({ config })

  payload.logger.info(
    `Exercise catalogue: ${catalog.exercises.length} entries from ${catalog.source.dataset} (${catalog.source.license})`,
  )
  if (DRY_RUN) payload.logger.info('Dry run — nothing will be written.')

  // Read every existing exercise once and index it by lowercased name, so the
  // import costs one query instead of one per catalogue entry.
  const existing = new Map<string, { id: number | string; description?: string | null }>()
  let page = 1
  for (;;) {
    const batch = await payload.find({ collection: 'exercises', limit: 500, page, depth: 0 })
    for (const doc of batch.docs) {
      if (typeof doc.name === 'string') {
        existing.set(doc.name.trim().toLowerCase(), { id: doc.id, description: doc.description })
      }
    }
    if (!batch.hasNextPage) break
    page += 1
  }
  payload.logger.info(`Already in the database: ${existing.size} exercises`)

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const entry of catalog.exercises) {
    const key = entry.name.trim().toLowerCase()
    const match = existing.get(key)

    try {
      if (!match) {
        if (!DRY_RUN) {
          await payload.create({
            collection: 'exercises',
            data: {
              name: entry.name,
              trackingType: entry.trackingType,
              muscleGroup: entry.muscleGroup,
              equipment: entry.equipment,
              description: entry.description,
            },
          })
        }
        created += 1
      } else if (UPDATE) {
        if (!DRY_RUN) {
          // videoUrl is deliberately absent: a link a coach added by hand is
          // theirs to keep, and the catalogue has nothing to put there.
          await payload.update({
            collection: 'exercises',
            id: match.id,
            data: {
              trackingType: entry.trackingType,
              muscleGroup: entry.muscleGroup,
              equipment: entry.equipment,
              description: entry.description,
            },
          })
        }
        updated += 1
      } else {
        skipped += 1
      }
    } catch (error) {
      failed += 1
      payload.logger.error(`Failed on "${entry.name}": ${(error as Error).message}`)
    }

    const done = created + updated + skipped + failed
    if (done % 200 === 0) payload.logger.info(`  ${done} / ${catalog.exercises.length}`)
  }

  payload.logger.info(
    `\nDone. created: ${created}, updated: ${updated}, left alone: ${skipped}, failed: ${failed}`,
  )
  payload.logger.info(catalog.source.note)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
