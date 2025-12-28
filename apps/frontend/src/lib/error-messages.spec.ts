import { describe, it, expect } from 'vitest';
import { getUserFriendlyErrorMessage } from './error-messages';

describe('getUserFriendlyErrorMessage', () => {
  it('gibt Fallback bei null zurück', () => {
    expect(getUserFriendlyErrorMessage(null)).toBe('Ein unbekannter Fehler ist aufgetreten.');
  });

  it('gibt Network-Fehler zurück', () => {
    const error = new Error('Network error');
    expect(getUserFriendlyErrorMessage(error)).toBe('Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.');
  });

  it('gibt 404 Meldung zurück', () => {
    const error = new Error('HTTP 404: Not Found');
    expect(getUserFriendlyErrorMessage(error)).toBe('Die angeforderten Daten wurden nicht gefunden.');
  });

  describe('getUserFriendlyErrorMessage - 409 Conflict (AC#8)', () => {
    it('gibt 409 Meldung zurück bei HTTP 409', () => {
      const error = new Error('Request failed with status 409');
      expect(getUserFriendlyErrorMessage(error)).toBe('Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.');
    });

    it('gibt 409 Meldung zurück bei "conflict"', () => {
      const error = new Error('Conflict: Device not available');
      expect(getUserFriendlyErrorMessage(error)).toBe('Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.');
    });

    it('gibt 409 Meldung zurück bei "bereits ausgeliehen"', () => {
      const error = new Error('Gerät ist bereits ausgeliehen');
      expect(getUserFriendlyErrorMessage(error)).toBe('Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.');
    });

    it('gibt 409 Meldung zurück bei "nicht verfügbar"', () => {
      const error = new Error('Device nicht verfügbar');
      expect(getUserFriendlyErrorMessage(error)).toBe('Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar.');
    });
  });
});
