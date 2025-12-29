import { QRCodeSVG } from 'qrcode.react';
import { tokenStorage } from '@/lib/tokenStorage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { TouchButton } from '@/components/ui/touch-button';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

/**
 * Generates the app URL with base64-encoded token parameter for QR code.
 * Token is encoded to avoid exposing it in plaintext in URLs/logs.
 */
function getAppUrlWithToken(): string {
  const token = tokenStorage.get();
  if (!token) {
    return APP_URL;
  }

  const url = new URL(APP_URL);
  // Base64-encode the token to avoid plaintext exposure in URLs
  const encodedToken = btoa(token);
  url.searchParams.set('token', encodedToken);
  return url.toString();
}

/**
 * QR Code component that displays the app URL with embedded API token.
 * Allows users to scan the QR code to auto-authenticate on other devices.
 */
export function AppQRCode() {
  const [copied, setCopied] = useState(false);
  const appUrlWithToken = getAppUrlWithToken();

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrlWithToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = appUrlWithToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">App-Zugang</CardTitle>
        <CardDescription>
          QR-Code scannen oder Link kopieren, um die App auf anderen Geräten zu öffnen.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG
            value={appUrlWithToken}
            size={180}
            level="M"
            includeMargin={false}
          />
        </div>
        <TouchButton
          variant="outline"
          onClick={handleCopyUrl}
          touchSize="md"
          className="w-full max-w-[200px]"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Kopiert!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Link kopieren
            </>
          )}
        </TouchButton>
      </CardContent>
    </Card>
  );
}
