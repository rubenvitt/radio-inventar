import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeviceGroupProps {
  label: string
  count: number
  defaultOpen?: boolean
  forceOpen?: boolean
  children: React.ReactNode
}

export function DeviceGroup({ label, count, defaultOpen = true, forceOpen = false, children }: DeviceGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = forceOpen || open

  return (
    <section role="group" aria-label={label} className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        disabled={forceOpen}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center gap-2 rounded-md px-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} aria-hidden="true" />
        <MapPin className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
        <span className="text-muted-foreground/70">({count})</span>
      </button>
      {isOpen && <div className="flex flex-col gap-2">{children}</div>}
    </section>
  )
}
