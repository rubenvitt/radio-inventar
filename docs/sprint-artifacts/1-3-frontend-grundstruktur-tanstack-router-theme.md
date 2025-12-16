# Story 1.3: Frontend-Grundstruktur mit TanStack Router & Theme

Status: Ready for Review

## Story

As a **Nutzer**,
I want **die App im Browser öffnen und zwischen Dark/Light Mode wechseln**,
so that **ich die App bei verschiedenen Lichtverhältnissen nutzen kann**.

## Acceptance Criteria

**Given** ein gestartetes Frontend (`pnpm dev`)
**When** ich `localhost:5173` im Browser öffne
**Then**:

1. Sehe ich eine Basis-App mit Navigation (Ausleihen, Zurückgeben, Übersicht)
2. Dark Mode ist standardmäßig aktiv
3. Ich kann per Toggle zu Light Mode wechseln
4. Die Theme-Einstellung wird im `localStorage` persistiert
5. TanStack Router ist konfiguriert mit Routes für `/`, `/loan`, `/return`

## Tasks / Subtasks

- [x] Task 1: Vite + React 19 Projekt initialisieren (AC: #1, #5)
  - [x] 1.1 Erstelle `apps/frontend/package.json` mit Dependencies
  - [x] 1.2 Erstelle `apps/frontend/tsconfig.json` (extends root)
  - [x] 1.3 Erstelle `apps/frontend/vite.config.ts` mit TanStack Router Plugin
  - [x] 1.4 Erstelle `apps/frontend/index.html` mit Root-Element
  - [x] 1.5 Erstelle `apps/frontend/src/main.tsx` (App Entry)
  - [x] 1.6 Erstelle `apps/frontend/.env.example` mit `VITE_API_URL`
  - [x] 1.7 **VERIFY:** `pnpm install` und `pnpm dev` startet ohne Fehler

- [x] Task 2: TanStack Router File-based Routing (AC: #1, #5)
  - [x] 2.1 Erstelle `apps/frontend/src/routes/__root.tsx` mit Layout + Navigation
  - [x] 2.2 Erstelle `apps/frontend/src/routes/index.tsx` für `/` (Übersicht)
  - [x] 2.3 Erstelle `apps/frontend/src/routes/loan.tsx` für `/loan` (Ausleihen)
  - [x] 2.4 Erstelle `apps/frontend/src/routes/return.tsx` für `/return` (Zurückgeben)
  - [x] 2.5 Erstelle `apps/frontend/src/routeTree.gen.ts` (wird automatisch generiert)
  - [x] 2.6 **VERIFY:** Navigation zwischen Routes funktioniert

- [x] Task 3: Tailwind CSS v4 + shadcn/ui Setup (AC: #2, #3)
  - [x] 3.1 Installiere Tailwind CSS v4 via `@tailwindcss/vite` Plugin
  - [x] 3.2 Erstelle `apps/frontend/src/globals.css` mit CSS Variables (Light/Dark)
  - [x] 3.3 Erstelle `apps/frontend/components.json` für shadcn/ui CLI
  - [x] 3.4 Erstelle `apps/frontend/src/lib/utils.ts` mit `cn()` Helper
  - [x] 3.5 shadcn/ui Button nicht separat installiert - ThemeToggle verwendet nativen Button mit Tailwind
  - [x] 3.6 **VERIFY:** Tailwind-Klassen werden korrekt angewendet

- [x] Task 4: Theme Provider + Dark Mode Toggle (AC: #2, #3, #4)
  - [x] 4.1 Erstelle `apps/frontend/src/components/theme-provider.tsx`
  - [x] 4.2 Erstelle `apps/frontend/src/components/features/ThemeToggle.tsx`
  - [x] 4.3 Integriere ThemeProvider in `__root.tsx`
  - [x] 4.4 Füge ThemeToggle zur Navigation hinzu
  - [x] 4.5 **VERIFY:** Dark Mode ist Default, Toggle funktioniert, localStorage persistiert

- [x] Task 5: Navigation Component (AC: #1)
  - [x] 5.1 Erstelle `apps/frontend/src/components/features/Navigation.tsx`
  - [x] 5.2 Implementiere Bottom Tab Navigation (Tablet-optimiert)
  - [x] 5.3 Füge Touch-Target-Größen hinzu (min. 64px - WCAG AAA)
  - [x] 5.4 **VERIFY:** Navigation zeigt aktiven Tab, Links funktionieren

- [x] Task 6: Workspace Integration
  - [x] 6.1 Füge Frontend-Scripts zu Root `package.json` hinzu (`dev:frontend`, `build:frontend`)
  - [x] 6.2 Füge `@radio-inventar/shared: "workspace:*"` zu Frontend-Dependencies
  - [x] 6.3 Verifiziere pnpm Workspace-Linking
  - [x] 6.4 **VERIFY:** `pnpm dev` startet Backend + Frontend parallel

### Review Follow-ups (AI-Review 2025-12-16)

- [x] **[CRITICAL]** Git Commit erstellen - Alle Frontend-Dateien + Root-Configs committen (21 Dateien untracked!)
- [x] **[HIGH]** FOUC Fix - Inline `<script>` in `index.html` vor React-Load um weißen Flash zu verhindern [apps/frontend/index.html]
- [x] **[HIGH]** localStorage Error Handling - try-catch für Private Browsing Mode [apps/frontend/src/components/theme-provider.tsx:24,45]
- [x] **[MEDIUM]** Navigation Accessibility - `aria-current="page"` für aktiven Link hinzufügen [apps/frontend/src/components/features/Navigation.tsx]
- [x] **[MEDIUM]** System Theme Support - matchMedia Listener für OS Theme Changes + Toggle erweitern [theme-provider.tsx, ThemeToggle.tsx]
- [x] **[MEDIUM]** Test-Infrastruktur Setup - Vitest + @testing-library/react installieren (nur Setup, keine Tests)
- [x] **[LOW]** Root Element null check - Defensive coding statt `!` assertion [apps/frontend/src/main.tsx:18]

## Dev Notes

### Story 1.1 & 1.2 Learnings (KRITISCH)

**Zod Version:** v3.24.0 (NICHT v4!) - Import: `import { z } from 'zod';`

**Monorepo-Struktur bereits etabliert:**
```
radio-inventar/
├── apps/
│   ├── backend/          # NestJS (Story 1.2 - DONE)
│   └── frontend/         # React + Vite (diese Story)
├── packages/
│   └── shared/           # Zod Schemas (Story 1.1 - DONE)
└── pnpm-workspace.yaml
```

**Shared Package Import Pattern:**
```typescript
import {
  DeviceSchema, LoanSchema,
  type Device, type Loan, type DeviceStatus,
  DEVICE_FIELD_LIMITS, LOAN_FIELD_LIMITS,
} from '@radio-inventar/shared';
```

---

### Tech Stack (Architektur-Vorgaben)

| Technology | Version | Hinweis |
|------------|---------|---------|
| React | 19.x | Neueste stabile Version |
| Vite | 6.x | Build Tool |
| TanStack Router | 1.141.x | File-based Routing |
| Tailwind CSS | 4.x | Via `@tailwindcss/vite` Plugin |
| shadcn/ui | latest | Radix UI basiert |
| TypeScript | 5.7.x | Strict Mode |

---

### Verzeichnis-Struktur (Ziel dieser Story)

```
apps/frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── components.json              # shadcn/ui config
├── .env.example
├── index.html
└── src/
    ├── main.tsx                 # App Entry
    ├── globals.css              # Tailwind imports + CSS Variables
    ├── routeTree.gen.ts         # Auto-generated
    │
    ├── routes/                  # TanStack Router (File-based)
    │   ├── __root.tsx           # Root Layout + Navigation + ThemeProvider
    │   ├── index.tsx            # "/" → Übersicht (Placeholder)
    │   ├── loan.tsx             # "/loan" → Ausleihen (Placeholder)
    │   └── return.tsx           # "/return" → Zurückgeben (Placeholder)
    │
    ├── components/
    │   ├── ui/                  # shadcn/ui (auto-generated)
    │   │   └── button.tsx
    │   ├── features/
    │   │   ├── Navigation.tsx
    │   │   └── ThemeToggle.tsx
    │   └── theme-provider.tsx
    │
    └── lib/
        └── utils.ts             # cn() helper
```

---

### TanStack Router Setup (KRITISCH)

**Vite Plugin Konfiguration:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**App Entry Point (KRITISCH):**
```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './globals.css'

// Router-Instanz erstellen
const router = createRouter({ routeTree })

// Type-Safety für Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// App rendern
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

**Root Route Pattern (mit Error Boundary):**
```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet, ErrorComponent } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Navigation } from '@/components/features/Navigation'

// Error Fallback für Route-Fehler
function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Fehler</h1>
        <p className="text-muted-foreground mb-4">
          {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Seite neu laden
        </button>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="radio-inventar-theme">
      <div className="min-h-screen bg-background text-foreground">
        <main className="pb-20">
          <Outlet />
        </main>
        <Navigation />
      </div>
    </ThemeProvider>
  ),
  errorComponent: RootErrorComponent,
})
```

**File Route Pattern:**
```typescript
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Übersicht</h1>
      <p className="text-muted-foreground">Geräte-Status wird in Story 2.2 implementiert</p>
    </div>
  )
}
```

```typescript
// src/routes/loan.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/loan')({
  component: LoanPage,
})

function LoanPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Ausleihen</h1>
      <p className="text-muted-foreground">Geräte-Ausleihe wird in Story 3.2 implementiert</p>
    </div>
  )
}
```

```typescript
// src/routes/return.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/return')({
  component: ReturnPage,
})

function ReturnPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Zurückgeben</h1>
      <p className="text-muted-foreground">Geräte-Rückgabe wird in Story 4.2 implementiert</p>
    </div>
  )
}
```

---

### Theme Provider Implementation (KRITISCH)

**Dark Mode als Default (FüKw-Nutzung nachts):**
```typescript
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',  // KRITISCH: Dark als Default!
  storageKey = 'radio-inventar-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

---

### CSS Variables (Tailwind v4 + shadcn/ui)

```css
/* src/globals.css */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;

  /* Status Colors */
  --status-available: oklch(0.723 0.219 142.136);
  --status-on-loan: oklch(0.769 0.188 70.08);
  --status-defect: oklch(0.577 0.245 27.325);
  --status-maintenance: oklch(0.556 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);

  /* Status Colors (Dark) */
  --status-available: oklch(0.627 0.194 142.495);
  --status-on-loan: oklch(0.769 0.188 70.08);
  --status-defect: oklch(0.704 0.191 22.216);
  --status-maintenance: oklch(0.708 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Status Colors */
  --color-status-available: var(--status-available);
  --color-status-on-loan: var(--status-on-loan);
  --color-status-defect: var(--status-defect);
  --color-status-maintenance: var(--status-maintenance);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

---

### cn() Helper (KRITISCH)

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### ThemeToggle Component (KRITISCH)

```typescript
// src/components/features/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        // Touch-Target: 64x64px (WCAG AAA)
        'flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-lg',
        'transition-colors touch-manipulation',
        'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
      aria-label={theme === 'dark' ? 'Zu Light Mode wechseln' : 'Zu Dark Mode wechseln'}
    >
      {theme === 'dark' ? (
        <Sun className="h-6 w-6" />
      ) : (
        <Moon className="h-6 w-6" />
      )}
      <span className="text-xs mt-1 font-medium">
        {theme === 'dark' ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}
```

---

### Navigation Component (Touch-optimiert)

```typescript
// src/components/features/Navigation.tsx
import { Link, useRouterState } from '@tanstack/react-router'
import { Radio, RotateCcw, LayoutGrid } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/loan', label: 'Ausleihen', icon: Radio },
  { to: '/return', label: 'Zurückgeben', icon: RotateCcw },
  { to: '/', label: 'Übersicht', icon: LayoutGrid },
] as const

export function Navigation() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                // Touch-Target: 64x64px (WCAG AAA)
                'flex flex-col items-center justify-center min-w-[64px] min-h-[64px] rounded-lg',
                'transition-colors touch-manipulation',
                isActive
                  ? 'text-primary bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </Link>
          )
        })}
        <ThemeToggle />
      </div>
    </nav>
  )
}
```

---

### Package Dependencies

**apps/frontend/package.json:**
```json
{
  "name": "@radio-inventar/frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.141.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "@radio-inventar/shared": "workspace:*"
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.141.0",
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "~5.7.0",
    "vite": "^6.0.0"
  }
}
```

---

### HTML Entry Point

**apps/frontend/index.html:**
```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>Radio Inventar</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**apps/frontend/.env.example:**
```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api
```

---

### shadcn/ui Configuration

**apps/frontend/components.json:**
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

---

### TypeScript Configuration

**apps/frontend/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**apps/frontend/tsconfig.node.json (KRITISCH):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**apps/frontend/src/vite-env.d.ts (KRITISCH):**
```typescript
/// <reference types="vite/client" />
```

---

### Root Package.json Scripts (Task 6.1)

**Hinzufügen zu `package.json` (Root):**
```json
{
  "scripts": {
    "dev": "pnpm run --parallel dev:backend dev:frontend",
    "dev:backend": "pnpm --filter @radio-inventar/backend dev",
    "dev:frontend": "pnpm --filter @radio-inventar/frontend dev",
    "build": "pnpm run build:shared && pnpm run --parallel build:backend build:frontend",
    "build:shared": "pnpm --filter @radio-inventar/shared build",
    "build:backend": "pnpm --filter @radio-inventar/backend build",
    "build:frontend": "pnpm --filter @radio-inventar/frontend build",
    "typecheck": "pnpm -r run typecheck"
  }
}
```

---

### UX-Anforderungen (KRITISCH)

**Touch-Targets:**
- Minimum: 44x44px (WCAG AA)
- Optimal: 64x64px (WCAG AAA)
- Spacing: Min. 16px zwischen Targets

**Farbcodierung (Status):**
- Verfügbar: Grün (`--status-available`)
- Ausgeliehen: Orange (`--status-on-loan`)
- Defekt: Rot (`--status-defect`)
- Wartung: Grau (`--status-maintenance`)

**Performance Budget:**
- Initial Load: < 3 Sekunden
- JavaScript Bundle: < 200KB (gzipped)
- CSS: < 50KB (gzipped)
- Total First Load: < 400KB

**Dark Mode:**
- Default-Modus (FüKw-Nutzung nachts)
- Toggle prominent im Header/Navigation
- Background: oklch(0.145 0 0) (nicht reines Schwarz)
- Alle Texte WCAG AA-konform (4.5:1+ Kontrast)

---

### Scope-Abgrenzung

**In dieser Story:**
- Vite + React 19 Setup
- TanStack Router (File-based) mit 3 Routes
- Tailwind CSS v4 + CSS Variables
- shadcn/ui Base Setup (Button)
- ThemeProvider + Dark Mode Toggle
- Bottom Tab Navigation
- Placeholder-Content für alle Routes
- Error Boundary für Route-Fehler

**NICHT in dieser Story:**
- TanStack Query (Story 2.x)
- TanStack Form (Story 3.x)
- API-Integration (spätere Stories)
- Device-Komponenten (Story 1.4)
- Admin-Bereich (Epic 5)
- Tests (werden in Code-Review hinzugefügt)

**Optional (Nice-to-Have für Entwicklung):**
- TanStack Router DevTools (`@tanstack/router-devtools`) - nur in Development Mode aktivieren

---

### References

- [Source: docs/architecture.md#Frontend-Stack] - Tech Stack Vorgaben
- [Source: docs/architecture.md#Project-Structure] - Verzeichnis-Struktur
- [Source: docs/prd.md#FR26-FR28] - UI/UX Anforderungen
- [Source: docs/ux-design-specification.md#Touch-Targets] - Touch-Optimierung
- [Source: docs/ux-design-specification.md#Dark-Mode] - Theme-Strategie
- [Source: docs/epics.md#Epic-1-Story-3] - Acceptance Criteria
- [Source: docs/sprint-artifacts/1-2-backend-grundstruktur-prisma-postgresql.md] - Vorherige Story Learnings
- [TanStack Router Docs] - File-based Routing Setup
- [shadcn/ui Docs] - Vite Dark Mode Configuration

## Dev Agent Record

### Context Reference

<!-- Diese Story enthält bereits den vollständigen Kontext -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

<!-- Wird während der Implementierung ergänzt -->

### Completion Notes List

**Implementiert am 2025-12-16:**
- Vite 6.4.1 + React 19 Frontend erfolgreich initialisiert
- TanStack Router v1.141 mit File-based Routing konfiguriert (routeTree.gen.ts automatisch generiert)
- Tailwind CSS v4 mit @tailwindcss/vite Plugin und vollständigen CSS Variables (Light/Dark)
- ThemeProvider mit Dark Mode als Default + localStorage-Persistierung
- Bottom Tab Navigation mit 64x64px Touch-Targets (WCAG AAA)
- Workspace-Integration: Frontend-Scripts in Root package.json, shared-Package verlinkt
- TypeScript: Strict Mode, noUnusedLocals, noUncheckedIndexedAccess
- tsconfig.node.json mit composite: true für Vite-Config
- shadcn/ui components.json konfiguriert (Button wird bei Bedarf via CLI hinzugefügt)

### Change Log

| Datum | Änderung | Agent |
|-------|----------|-------|
| 2025-12-16 | Story erstellt mit vollständigem Kontext aus 6 parallelen Subagents (Epic, Architecture, PRD, UX, TanStack Router Docs, shadcn/ui Docs) | Claude Opus 4.5 (Scrum Master) |
| 2025-12-16 | **Story Validation durchgeführt:** 3 CRITICAL, 4 MEDIUM, 3 LOW Issues identifiziert und behoben. Hinzugefügt: main.tsx mit routeTree.gen Import, tsconfig.node.json, vite-env.d.ts, ThemeToggle Implementation, cn() Helper, Error Boundary, Root package.json Scripts, loan.tsx/return.tsx Route Examples, index.html, .env.example | Claude Opus 4.5 (Scrum Master - Validate) |
| 2025-12-16 | **Story implementiert:** Alle 6 Tasks abgeschlossen. Vite 6.4.1 + React 19 + TanStack Router 1.141 + Tailwind CSS v4. Frontend startet auf localhost:5173. TypeScript PASS. | Claude Opus 4.5 (Dev Agent) |
| 2025-12-16 | **Code Review (Adversarial):** 5 Subagents parallel. Gefunden: 5 CRITICAL, 7 MEDIUM, 6 LOW Issues. Nach Filterung gegen Architektur/Stories: 7 Action Items erstellt (1 CRITICAL, 2 HIGH, 3 MEDIUM, 1 LOW). Status → in-progress. | Claude Opus 4.5 (Dev Agent - Code Review) |
| 2025-12-16 | **Review Follow-ups behoben (5 Subagents parallel):** FOUC Fix (inline script), localStorage try-catch, System Theme Support (matchMedia listener), Navigation aria-current, Test-Infrastruktur (Vitest), Root null check. Alle 7 Items ✅. Status → Ready for Review. | Claude Opus 4.5 (Dev Agent) |

### File List

**Zu erstellende Dateien:**
- `apps/frontend/package.json` - Frontend Package Definition
- `apps/frontend/tsconfig.json` - TypeScript Konfiguration
- `apps/frontend/tsconfig.node.json` - Node TypeScript Konfiguration
- `apps/frontend/vite.config.ts` - Vite + TanStack Router + Tailwind
- `apps/frontend/components.json` - shadcn/ui CLI Konfiguration
- `apps/frontend/.env.example` - Environment Template
- `apps/frontend/index.html` - HTML Entry Point
- `apps/frontend/src/main.tsx` - React Entry Point
- `apps/frontend/src/globals.css` - Tailwind + CSS Variables
- `apps/frontend/src/vite-env.d.ts` - Vite Types
- `apps/frontend/src/routes/__root.tsx` - Root Layout
- `apps/frontend/src/routes/index.tsx` - Übersicht Route
- `apps/frontend/src/routes/loan.tsx` - Ausleihen Route
- `apps/frontend/src/routes/return.tsx` - Zurückgeben Route
- `apps/frontend/src/components/theme-provider.tsx` - Theme Context
- `apps/frontend/src/components/features/Navigation.tsx` - Bottom Nav
- `apps/frontend/src/components/features/ThemeToggle.tsx` - Dark/Light Toggle
- `apps/frontend/src/lib/utils.ts` - cn() Helper
- `apps/frontend/src/routeTree.gen.ts` - Auto-generiert durch TanStack Router Plugin

**Nicht erstellt (nicht benötigt für MVP):**
- `apps/frontend/src/components/ui/button.tsx` - shadcn Button wird bei Bedarf via CLI hinzugefügt

**Review Follow-ups erstellte Dateien:**
- `apps/frontend/vitest.config.ts` - Vitest Konfiguration
- `apps/frontend/src/test/setup.ts` - Testing-Library Setup

**Aktualisierte Dateien:**
- `package.json` (Root) - Frontend-Scripts hinzugefügt (dev:frontend, build:frontend, dev parallel)
- `tsconfig.json` (Root) - Frontend-Referenz hinzugefügt
- `apps/frontend/package.json` - Test-Dependencies + Scripts (vitest, @testing-library/react)
- `apps/frontend/tsconfig.json` - Vitest Types hinzugefügt
- `apps/frontend/index.html` - FOUC Fix (inline theme script)
- `apps/frontend/src/main.tsx` - Defensive null check
- `apps/frontend/src/components/theme-provider.tsx` - localStorage try-catch + matchMedia listener
- `apps/frontend/src/components/features/ThemeToggle.tsx` - 3-way toggle (dark/light/system)
- `apps/frontend/src/components/features/Navigation.tsx` - aria-current="page"
