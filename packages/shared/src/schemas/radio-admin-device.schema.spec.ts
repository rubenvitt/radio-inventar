import { describe, it, expect } from 'vitest';
import {
  RadioAdminLoanDeviceSchema,
  mapRadioAdminStatus,
} from './radio-admin-device.schema.js';

const validPayload = {
  id: 'we3hm7h7pio2ddufaockc09j',
  issi: '1001',
  opta: 'O-1',
  rufname: 'Florian 4-23',
  status: 'Einsatzbereit',
  location: 'Lager',
  deviceType: 'HRT',
  serialNumber: 'SN-1',
  hersteller: 'Sepura',
  bedieneinheit: null,
  funktion: null,
};

describe('RadioAdminLoanDeviceSchema', () => {
  it('parses a valid loan-device payload from radio-admin', () => {
    const parsed = RadioAdminLoanDeviceSchema.parse(validPayload);
    expect(parsed.id).toBe('we3hm7h7pio2ddufaockc09j');
    expect(parsed.rufname).toBe('Florian 4-23');
    expect(parsed.serialNumber).toBe('SN-1');
  });

  it('accepts null for the nullable fields', () => {
    const parsed = RadioAdminLoanDeviceSchema.parse({
      ...validPayload,
      rufname: null,
      serialNumber: null,
      status: null,
      deviceType: null,
    });
    expect(parsed.rufname).toBeNull();
    expect(parsed.serialNumber).toBeNull();
  });

  it('rejects a payload without an id', () => {
    const { id: _omit, ...withoutId } = validPayload;
    void _omit;
    expect(RadioAdminLoanDeviceSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe('mapRadioAdminStatus', () => {
  it('returns ON_LOAN when there is an active loan, regardless of radio-admin status', () => {
    expect(mapRadioAdminStatus('Einsatzbereit', true)).toBe('ON_LOAN');
    expect(mapRadioAdminStatus(null, true)).toBe('ON_LOAN');
    expect(mapRadioAdminStatus('Defekt', true)).toBe('ON_LOAN');
  });

  it('maps the defekt free-text to DEFECT (case-insensitive, trimmed)', () => {
    expect(mapRadioAdminStatus('Defekt', false)).toBe('DEFECT');
    expect(mapRadioAdminStatus('defekt', false)).toBe('DEFECT');
    expect(mapRadioAdminStatus('  DEFEKT  ', false)).toBe('DEFECT');
  });

  it('maps the wartung free-text to MAINTENANCE (case-insensitive, trimmed)', () => {
    expect(mapRadioAdminStatus('Wartung', false)).toBe('MAINTENANCE');
    expect(mapRadioAdminStatus('wartung', false)).toBe('MAINTENANCE');
  });

  it('maps everything else (incl. null and Ausgeliehen) to AVAILABLE', () => {
    expect(mapRadioAdminStatus(null, false)).toBe('AVAILABLE');
    expect(mapRadioAdminStatus('Einsatzbereit', false)).toBe('AVAILABLE');
    expect(mapRadioAdminStatus('Ausgeliehen', false)).toBe('AVAILABLE');
    expect(mapRadioAdminStatus('Sonstiges', false)).toBe('AVAILABLE');
    expect(mapRadioAdminStatus('', false)).toBe('AVAILABLE');
  });
});
