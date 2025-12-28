// Touch-Size-Konstanten
export const TOUCH_TARGETS = {
  sm: 44,  // WCAG AA Minimum
  md: 56,  // Input-Felder
  lg: 64,  // WCAG AAA, Primär-Buttons
  xl: 88,  // Handschuh-optimiert, DeviceCards
} as const

export type TouchTargetSize = keyof typeof TOUCH_TARGETS
