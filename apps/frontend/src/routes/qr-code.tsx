import { createFileRoute } from '@tanstack/react-router'
import { AppQRCode } from '@/components/features/admin/AppQRCode'

export const Route = createFileRoute('/qr-code')({
  component: QRCodePage,
})

function QRCodePage() {
  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">App-Zugang</h1>
      <AppQRCode />
    </div>
  )
}
