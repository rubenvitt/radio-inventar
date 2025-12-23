import { Check, AlertCircle, XCircle, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardStats {
  availableCount: number
  onLoanCount: number
  defectCount: number
  maintenanceCount: number
}

interface DashboardStatsCardsProps {
  stats: DashboardStats
}

interface StatCardProps {
  title: string
  count: number
  color: 'green' | 'orange' | 'red' | 'gray'
  icon: React.ReactNode
}

// Color configurations from UX spec (exact Tailwind classes from story lines 273-277)
const colorConfig = {
  green: 'bg-green-500 dark:bg-green-600',
  orange: 'bg-orange-500 dark:bg-orange-600',
  red: 'bg-red-500 dark:bg-red-600',
  gray: 'bg-gray-500 dark:bg-gray-600',
} as const

function StatCard({ title, count, color, icon }: StatCardProps) {
  const badgeColorClass = colorConfig[color]

  return (
    <Card className="min-h-[120px] p-6 rounded-lg hover:shadow-lg transition-shadow">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={cn(
              'rounded-full p-2 text-white',
              badgeColorClass
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="text-5xl font-bold" aria-label={`${count} ${title}`}>
          {count}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Verfügbar"
        count={stats.availableCount}
        color="green"
        icon={<Check className="h-5 w-5" />}
      />
      <StatCard
        title="Ausgeliehen"
        count={stats.onLoanCount}
        color="orange"
        icon={<AlertCircle className="h-5 w-5" />}
      />
      <StatCard
        title="Defekt"
        count={stats.defectCount}
        color="red"
        icon={<XCircle className="h-5 w-5" />}
      />
      <StatCard
        title="Wartung"
        count={stats.maintenanceCount}
        color="gray"
        icon={<Wrench className="h-5 w-5" />}
      />
    </div>
  )
}
