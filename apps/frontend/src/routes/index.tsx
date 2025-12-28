import { createFileRoute } from '@tanstack/react-router'
import { DeviceList } from '@/components/features/DeviceList'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  return (
    <div className="pb-4">
      <DeviceList />
    </div>
  )
}
