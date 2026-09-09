import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import React from 'react'

import { loadShareLink } from '@/modules/sharing/server'
import { WorkoutPlans } from '@/modules/training/components/workout-plans'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>
}) {
  const { token } = await params
  const data = await loadShareLink(token)

  if (!data) notFound()

  const t = await getTranslations('share')
  const format = await getFormatter()
  const expiryDate = format.dateTime(new Date(data.meta.expiresAt), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageContainer>
      <PageHeader
        className="mb-6"
        layout="stacked"
        title={data.meta.planTitle}
        right={
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-ui-fg-muted">{t('expiresOn', { date: expiryDate })}</span>
            <ThemeToggle />
          </div>
        }
      />

      {data.plan ? (
        <WorkoutPlans
          plans={data.plan}
          readOnly={true}
          showResults={data.meta.permissions.includes('results')}
        />
      ) : (
        <div className="py-10 text-center text-sm text-ui-fg-muted">{t('noPlan')}</div>
      )}
    </PageContainer>
  )
}
