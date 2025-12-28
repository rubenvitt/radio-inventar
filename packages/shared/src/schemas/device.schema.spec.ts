/**
 * Tests für device.schema.ts - Deutsche Zod-Fehlermeldungen
 *
 * Diese Tests verifizieren:
 * 1. Deutsche Fehlermeldungen für alle Validierungsfälle
 * 2. Korrekte Validierung der Feldlängen
 * 3. Unterstützung für deutsche Umlaute (ä, ö, ü, ß)
 * 4. Transform-Logik für nullable/nullish Felder
 */

import { describe, it, expect } from 'vitest';
import {
  DeviceSchema,
  CreateDeviceSchema,
  UpdateDeviceSchema,
  DEVICE_FIELD_LIMITS,
} from './device.schema.js';

describe('DeviceSchema - Deutsche Fehlermeldungen', () => {
  describe('CreateDeviceSchema Validierung', () => {
    it('wirft deutsche Fehlermeldung bei fehlendem callSign', () => {
      const result = CreateDeviceSchema.safeParse({
        // callSign fehlt
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const callSignError = result.error.errors.find(
          (e) => e.path[0] === 'callSign'
        );
        expect(callSignError?.message).toBe('Pflichtfeld');
      }
    });

    it('wirft deutsche Fehlermeldung bei leerem callSign', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: '',
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const callSignError = result.error.errors.find(
          (e) => e.path[0] === 'callSign'
        );
        expect(callSignError?.message).toBe('Pflichtfeld');
      }
    });

    it('wirft deutsche Fehlermeldung bei whitespace-only callSign', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: '   ',
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const callSignError = result.error.errors.find(
          (e) => e.path[0] === 'callSign'
        );
        expect(callSignError?.message).toBe('Pflichtfeld');
      }
    });

    it('wirft deutsche Fehlermeldung bei zu langem callSign', () => {
      const tooLongCallSign = 'A'.repeat(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX + 1);
      const result = CreateDeviceSchema.safeParse({
        callSign: tooLongCallSign,
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const callSignError = result.error.errors.find(
          (e) => e.path[0] === 'callSign'
        );
        expect(callSignError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.CALL_SIGN_MAX} Zeichen erlaubt`
        );
      }
    });

    it('wirft deutsche Fehlermeldung bei fehlendem deviceType', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        // deviceType fehlt
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const deviceTypeError = result.error.errors.find(
          (e) => e.path[0] === 'deviceType'
        );
        expect(deviceTypeError?.message).toBe('Pflichtfeld');
      }
    });

    it('wirft deutsche Fehlermeldung bei leerem deviceType', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const deviceTypeError = result.error.errors.find(
          (e) => e.path[0] === 'deviceType'
        );
        expect(deviceTypeError?.message).toBe('Pflichtfeld');
      }
    });

    it('wirft deutsche Fehlermeldung bei zu langem deviceType', () => {
      const tooLongType = 'A'.repeat(DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX + 1);
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: tooLongType,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const deviceTypeError = result.error.errors.find(
          (e) => e.path[0] === 'deviceType'
        );
        expect(deviceTypeError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX} Zeichen erlaubt`
        );
      }
    });

    it('wirft deutsche Fehlermeldung bei zu langer serialNumber', () => {
      const tooLongSerial = 'A'.repeat(
        DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX + 1
      );
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        serialNumber: tooLongSerial,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const serialError = result.error.errors.find(
          (e) => e.path[0] === 'serialNumber'
        );
        expect(serialError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX} Zeichen erlaubt`
        );
      }
    });

    it('wirft deutsche Fehlermeldung bei zu langen notes', () => {
      const tooLongNotes = 'A'.repeat(DEVICE_FIELD_LIMITS.NOTES_MAX + 1);
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        notes: tooLongNotes,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const notesError = result.error.errors.find(
          (e) => e.path[0] === 'notes'
        );
        expect(notesError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.NOTES_MAX} Zeichen erlaubt`
        );
      }
    });
  });

  describe('UpdateDeviceSchema Validierung', () => {
    it('wirft deutsche Fehlermeldung bei zu langen notes', () => {
      const tooLongNotes = 'A'.repeat(DEVICE_FIELD_LIMITS.NOTES_MAX + 1);
      const result = UpdateDeviceSchema.safeParse({
        notes: tooLongNotes,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const notesError = result.error.errors.find(
          (e) => e.path[0] === 'notes'
        );
        expect(notesError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.NOTES_MAX} Zeichen erlaubt`
        );
      }
    });

    it('wirft deutsche Fehlermeldung bei zu langem callSign', () => {
      const tooLongCallSign = 'A'.repeat(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX + 1);
      const result = UpdateDeviceSchema.safeParse({
        callSign: tooLongCallSign,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const callSignError = result.error.errors.find(
          (e) => e.path[0] === 'callSign'
        );
        expect(callSignError?.message).toBe(
          `Maximal ${DEVICE_FIELD_LIMITS.CALL_SIGN_MAX} Zeichen erlaubt`
        );
      }
    });

    it('akzeptiert leeres Update-Objekt (alle Felder optional)', () => {
      const result = UpdateDeviceSchema.safeParse({});

      expect(result.success).toBe(true);
    });
  });

  describe('Deutsche Umlaute-Unterstützung', () => {
    it('akzeptiert callSign mit deutschen Umlauten (ä, ö, ü)', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Führungsfahrzeug Löschzug Köln',
        deviceType: 'Fahrzeugfunk',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.callSign).toBe('Führungsfahrzeug Löschzug Köln');
      }
    });

    it('akzeptiert deviceType mit deutschen Umlauten und ß', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät für Außeneinsätze',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deviceType).toBe('Funkgerät für Außeneinsätze');
      }
    });

    it('akzeptiert serialNumber mit Umlauten', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        serialNumber: 'Seriennummer-Ä123Ö456Ü789',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serialNumber).toBe('Seriennummer-Ä123Ö456Ü789');
      }
    });

    it('akzeptiert notes mit deutschen Umlauten und Sonderzeichen', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        notes: 'Überprüfung nötig wegen Störgeräusch. Größe: 30cm. Gewicht: 500g.',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(
          'Überprüfung nötig wegen Störgeräusch. Größe: 30cm. Gewicht: 500g.'
        );
      }
    });

    it('trimmt Whitespace bei Umlauten korrekt', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: '  Führungsfahrzeug  ',
        deviceType: '  Funkgerät  ',
        notes: '  Überprüfung nötig  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.callSign).toBe('Führungsfahrzeug');
        expect(result.data.deviceType).toBe('Funkgerät');
        expect(result.data.notes).toBe('Überprüfung nötig');
      }
    });
  });

  describe('Transform-Logik für nullable/nullish Felder', () => {
    it('transformiert leeren serialNumber String zu null', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        serialNumber: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serialNumber).toBe(null);
      }
    });

    it('transformiert whitespace-only serialNumber zu null', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        serialNumber: '   ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serialNumber).toBe(null);
      }
    });

    it('transformiert leere notes zu null', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        notes: '',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(null);
      }
    });

    it('transformiert whitespace-only notes zu null', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        notes: '   ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(null);
      }
    });

    it('akzeptiert undefined für nullish serialNumber', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        // serialNumber ist undefined (nicht übergeben)
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serialNumber).toBe(null);
      }
    });

    it('akzeptiert undefined für nullish notes', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        // notes ist undefined (nicht übergeben)
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(null);
      }
    });
  });

  describe('Gültige Eingaben', () => {
    it('akzeptiert minimales gültiges Device (nur Pflichtfelder)', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.callSign).toBe('Florian 4-23');
        expect(result.data.deviceType).toBe('Funkgerät');
        expect(result.data.serialNumber).toBe(null);
        expect(result.data.notes).toBe(null);
      }
    });

    it('akzeptiert vollständiges gültiges Device', () => {
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Handfunkgerät',
        serialNumber: 'SN-2024-001',
        notes: 'Neues Gerät, einwandfreier Zustand',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.callSign).toBe('Florian 4-23');
        expect(result.data.deviceType).toBe('Handfunkgerät');
        expect(result.data.serialNumber).toBe('SN-2024-001');
        expect(result.data.notes).toBe('Neues Gerät, einwandfreier Zustand');
      }
    });

    it('akzeptiert callSign an der Maximallänge', () => {
      const maxLengthCallSign = 'A'.repeat(DEVICE_FIELD_LIMITS.CALL_SIGN_MAX);
      const result = CreateDeviceSchema.safeParse({
        callSign: maxLengthCallSign,
        deviceType: 'Funkgerät',
      });

      expect(result.success).toBe(true);
    });

    it('akzeptiert notes an der Maximallänge', () => {
      const maxLengthNotes = 'A'.repeat(DEVICE_FIELD_LIMITS.NOTES_MAX);
      const result = CreateDeviceSchema.safeParse({
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        notes: maxLengthNotes,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('DeviceSchema - Vollständiges Schema mit Timestamps', () => {
    it('akzeptiert vollständiges Device mit allen Feldern', () => {
      const result = DeviceSchema.safeParse({
        id: 'cmb8qvznl0000lk08ahhef0nm',
        callSign: 'Florian 4-23',
        serialNumber: 'SN-2024-001',
        deviceType: 'Handfunkgerät',
        status: 'AVAILABLE',
        notes: 'Neues Gerät',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });

      expect(result.success).toBe(true);
    });

    it('wirft deutsche Fehlermeldung bei ungültiger CUID2', () => {
      const result = DeviceSchema.safeParse({
        id: 'invalid-cuid2',
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const idError = result.error.errors.find((e) => e.path[0] === 'id');
        expect(idError?.message).toBe('Ungültige CUID2');
      }
    });

    it('wirft deutsche Fehlermeldung bei ungültigem Status', () => {
      const result = DeviceSchema.safeParse({
        id: 'cmb8qvznl0000lk08ahhef0nm',
        callSign: 'Florian 4-23',
        deviceType: 'Funkgerät',
        status: 'INVALID_STATUS',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const statusError = result.error.errors.find(
          (e) => e.path[0] === 'status'
        );
        expect(statusError?.message).toContain('Ungültiger Wert');
        expect(statusError?.message).toContain('AVAILABLE');
        expect(statusError?.message).toContain('ON_LOAN');
        expect(statusError?.message).toContain('DEFECT');
        expect(statusError?.message).toContain('MAINTENANCE');
      }
    });
  });
});
