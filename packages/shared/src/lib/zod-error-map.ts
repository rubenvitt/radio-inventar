/**
 * Deutsche Fehlermeldungen für Zod-Validierung
 *
 * Diese Error Map übersetzt Zod-Validierungsfehler ins Deutsche.
 * Sie wird global für alle Schemas im shared package verwendet.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { germanErrorMap } from './lib/zod-error-map';
 *
 * z.setErrorMap(germanErrorMap);
 * ```
 *
 * @see https://zod.dev/ERROR_HANDLING?id=customizing-errors-with-zoderrormap
 */

import { z } from 'zod';

/**
 * Deutsche Error Map für Zod-Validierung
 *
 * Übersetzt häufige Validierungsfehler ins Deutsche mit kontextspezifischen
 * Informationen (z.B. erwartete Mindest-/Maximallänge).
 */
export const germanErrorMap: z.ZodErrorMap = (issue) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.input === undefined) {
        return { message: 'Pflichtfeld' };
      }
      if (issue.expected === 'string') {
        return { message: 'Ungültiger Typ: Text erwartet' };
      }
      if (issue.expected === 'number' || issue.expected === 'int') {
        return { message: 'Ungültiger Typ: Zahl erwartet' };
      }
      if (issue.expected === 'boolean') {
        return { message: 'Ungültiger Typ: Ja/Nein erwartet' };
      }
      return { message: 'Ungültiger Typ' };

    case z.ZodIssueCode.too_small:
      if (issue.origin === 'string') {
        if (issue.minimum === 1) {
          return { message: 'Pflichtfeld' };
        }
        return {
          message: `Mindestens ${issue.minimum} Zeichen erforderlich`,
        };
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return {
          message: `Wert muss mindestens ${issue.minimum} sein`,
        };
      }
      if (issue.origin === 'array') {
        return {
          message: `Mindestens ${issue.minimum} Elemente erforderlich`,
        };
      }
      return { message: 'Wert zu klein' };

    case z.ZodIssueCode.too_big:
      if (issue.origin === 'string') {
        return {
          message: `Maximal ${issue.maximum} Zeichen erlaubt`,
        };
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return {
          message: `Wert darf maximal ${issue.maximum} sein`,
        };
      }
      if (issue.origin === 'array') {
        return {
          message: `Maximal ${issue.maximum} Elemente erlaubt`,
        };
      }
      return { message: 'Wert zu groß' };

    case z.ZodIssueCode.invalid_format:
      if (issue.format === 'email') {
        return { message: 'Ungültige E-Mail-Adresse' };
      }
      if (issue.format === 'url') {
        return { message: 'Ungültige URL' };
      }
      if (issue.format === 'uuid') {
        return { message: 'Ungültige UUID' };
      }
      if (issue.format === 'regex') {
        return { message: 'Ungültiges Format' };
      }
      return { message: 'Ungültiger Text' };

    case z.ZodIssueCode.invalid_value:
      return {
        message: `Ungültiger Wert. Erlaubt: ${issue.values.join(', ')}`,
      };

    case z.ZodIssueCode.custom:
      // Allow custom error messages to pass through
      return issue.message ? { message: issue.message } : undefined;

    case z.ZodIssueCode.invalid_union:
      return { message: 'Ungültiger Wert' };

    case z.ZodIssueCode.unrecognized_keys:
      return {
        message: `Unbekannte Felder: ${issue.keys.join(', ')}`,
      };

    case z.ZodIssueCode.not_multiple_of:
      return {
        message: `Wert muss ein Vielfaches von ${issue.divisor} sein`,
      };

    default:
      // Fallback to default error message
      return undefined;
  }
};
