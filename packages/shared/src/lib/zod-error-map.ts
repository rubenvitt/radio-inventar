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
export const germanErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return { message: 'Pflichtfeld' };
      }
      if (issue.expected === 'string') {
        return { message: 'Ungültiger Typ: Text erwartet' };
      }
      if (issue.expected === 'number') {
        return { message: 'Ungültiger Typ: Zahl erwartet' };
      }
      if (issue.expected === 'boolean') {
        return { message: 'Ungültiger Typ: Ja/Nein erwartet' };
      }
      return { message: 'Ungültiger Typ' };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) {
          return { message: 'Pflichtfeld' };
        }
        return {
          message: `Mindestens ${issue.minimum} Zeichen erforderlich`,
        };
      }
      if (issue.type === 'number') {
        return {
          message: `Wert muss mindestens ${issue.minimum} sein`,
        };
      }
      if (issue.type === 'array') {
        return {
          message: `Mindestens ${issue.minimum} Elemente erforderlich`,
        };
      }
      return { message: 'Wert zu klein' };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return {
          message: `Maximal ${issue.maximum} Zeichen erlaubt`,
        };
      }
      if (issue.type === 'number') {
        return {
          message: `Wert darf maximal ${issue.maximum} sein`,
        };
      }
      if (issue.type === 'array') {
        return {
          message: `Maximal ${issue.maximum} Elemente erlaubt`,
        };
      }
      return { message: 'Wert zu groß' };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: 'Ungültige E-Mail-Adresse' };
      }
      if (issue.validation === 'url') {
        return { message: 'Ungültige URL' };
      }
      if (issue.validation === 'uuid') {
        return { message: 'Ungültige UUID' };
      }
      if (issue.validation === 'cuid') {
        return { message: 'Ungültige CUID' };
      }
      if (issue.validation === 'cuid2') {
        return { message: 'Ungültige CUID2' };
      }
      if (issue.validation === 'regex') {
        return { message: 'Ungültiges Format' };
      }
      return { message: 'Ungültiger Text' };

    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `Ungültiger Wert. Erlaubt: ${issue.options.join(', ')}`,
      };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Ungültiges Datum' };

    case z.ZodIssueCode.custom:
      // Allow custom error messages to pass through
      return { message: ctx.defaultError };

    case z.ZodIssueCode.invalid_union:
      return { message: 'Ungültiger Wert' };

    case z.ZodIssueCode.invalid_literal:
      return { message: `Ungültiger Wert. Erwartet: ${JSON.stringify(issue.expected)}` };

    case z.ZodIssueCode.unrecognized_keys:
      return {
        message: `Unbekannte Felder: ${issue.keys.join(', ')}`,
      };

    case z.ZodIssueCode.invalid_arguments:
      return { message: 'Ungültige Argumente' };

    case z.ZodIssueCode.invalid_return_type:
      return { message: 'Ungültiger Rückgabewert' };

    case z.ZodIssueCode.not_multiple_of:
      return {
        message: `Wert muss ein Vielfaches von ${issue.multipleOf} sein`,
      };

    default:
      // Fallback to default error message
      return { message: ctx.defaultError };
  }
};
