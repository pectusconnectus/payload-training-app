import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { loadTrainingPlans } from '@/modules/training/plans/server'
import { WorkoutPlans } from '@/modules/training/components/workout-plans'
import { LogoutButton } from '@/components/common/logout-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'

export default async function HomePage() {
  const t = await getTranslations('home')
  const result = await loadTrainingPlans()

  if (!result.user) redirect('/login')

  return (
    <PageContainer>
      <PageHeader
        className="mb-4 sm:mb-7"
        title={t('greeting', { name: result.user.name || result.user.email || '' })}
        subtitle={t('yourTrainingPlans')}
        right={
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        }
      />

      {result.plans.length > 0 ? (
        <WorkoutPlans plans={result.plans} />
      ) : (
        <div className="py-10 text-center text-sm text-ui-fg-muted">{t('noPlans')}</div>
      )}
    </PageContainer>
  )
}
