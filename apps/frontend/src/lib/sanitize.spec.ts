import { describe, it, expect } from 'vitest';
import { sanitizeForDisplay } from './sanitize';

describe('sanitizeForDisplay', () => {
  describe('dangerous URL schemes', () => {
    describe('javascript: URLs', () => {
      it('blocks javascript: URLs', () => {
        expect(sanitizeForDisplay('javascript:alert(1)')).toBe('');
      });

      it('blocks javascript: URLs with case variations', () => {
        expect(sanitizeForDisplay('JavaScript:alert(1)')).toBe('');
        expect(sanitizeForDisplay('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeForDisplay('JaVaScRiPt:alert(1)')).toBe('');
      });

      it('blocks javascript: URLs with leading whitespace', () => {
        expect(sanitizeForDisplay('  javascript:alert(1)')).toBe('');
        expect(sanitizeForDisplay('\tjavascript:alert(1)')).toBe('');
        expect(sanitizeForDisplay('\njavascript:alert(1)')).toBe('');
      });

      it('blocks javascript: URLs with control characters', () => {
        expect(sanitizeForDisplay('\x00javascript:alert(1)')).toBe('');
        expect(sanitizeForDisplay('\x01javascript:alert(1)')).toBe('');
      });

      it('blocks URL-encoded javascript: URLs', () => {
        // %6A%61%76%61%73%63%72%69%70%74%3A = javascript:
        expect(sanitizeForDisplay('%6A%61%76%61%73%63%72%69%70%74%3Aalert(1)')).toBe('');
        expect(sanitizeForDisplay('%6a%61%76%61%73%63%72%69%70%74%3aalert(1)')).toBe('');
      });
    });

    describe('data: URLs', () => {
      it('blocks data: URLs', () => {
        expect(sanitizeForDisplay('data:text/html,<script>alert(1)</script>')).toBe('');
      });

      it('blocks data: URLs with case variations', () => {
        expect(sanitizeForDisplay('Data:text/html,test')).toBe('');
        expect(sanitizeForDisplay('DATA:text/html,test')).toBe('');
        expect(sanitizeForDisplay('DaTa:text/html,test')).toBe('');
      });

      it('blocks data: URLs with base64', () => {
        expect(sanitizeForDisplay('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('');
      });

      it('blocks URL-encoded data: URLs', () => {
        // %64%61%74%61%3A = data:
        expect(sanitizeForDisplay('%64%61%74%61%3Atext/html,test')).toBe('');
      });
    });

    describe('vbscript: URLs', () => {
      it('blocks vbscript: URLs', () => {
        expect(sanitizeForDisplay('vbscript:msgbox(1)')).toBe('');
      });

      it('blocks vbscript: URLs with case variations', () => {
        expect(sanitizeForDisplay('VBScript:msgbox(1)')).toBe('');
        expect(sanitizeForDisplay('VBSCRIPT:msgbox(1)')).toBe('');
        expect(sanitizeForDisplay('VbScRiPt:msgbox(1)')).toBe('');
      });

      it('blocks URL-encoded vbscript: URLs', () => {
        // %76%62%73%63%72%69%70%74%3A = vbscript:
        expect(sanitizeForDisplay('%76%62%73%63%72%69%70%74%3Amsgbox(1)')).toBe('');
      });
    });

    describe('file: URLs', () => {
      it('blocks file: URLs', () => {
        expect(sanitizeForDisplay('file:///etc/passwd')).toBe('');
      });

      it('blocks file: URLs with case variations', () => {
        expect(sanitizeForDisplay('File:///etc/passwd')).toBe('');
        expect(sanitizeForDisplay('FILE:///etc/passwd')).toBe('');
        expect(sanitizeForDisplay('FiLe:///etc/passwd')).toBe('');
      });

      it('blocks URL-encoded file: URLs', () => {
        // %66%69%6c%65%3A = file:
        expect(sanitizeForDisplay('%66%69%6c%65%3A///etc/passwd')).toBe('');
      });
    });

    describe('mixed obfuscation', () => {
      it('blocks partially URL-encoded javascript: URLs', () => {
        expect(sanitizeForDisplay('%6Aavascript:alert(1)')).toBe('');
        expect(sanitizeForDisplay('java%73cript:alert(1)')).toBe('');
      });

      it('blocks URL-encoded with case variations', () => {
        expect(sanitizeForDisplay('%6A%61%56%61%73%63%72%69%70%74%3Aalert(1)')).toBe('');
      });
    });
  });

  describe('HTML injection', () => {
    it('removes HTML tags', () => {
      expect(sanitizeForDisplay('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeForDisplay('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
      expect(sanitizeForDisplay('<div>test</div>')).toBe('divtest/div');
    });

    it('removes angle brackets', () => {
      expect(sanitizeForDisplay('test<>test')).toBe('testtest');
      expect(sanitizeForDisplay('<<<>>>')).toBe('');
    });
  });

  describe('quote escaping', () => {
    it('removes double quotes', () => {
      expect(sanitizeForDisplay('test"test')).toBe('testtest');
      expect(sanitizeForDisplay('"quoted"')).toBe('quoted');
    });

    it('removes single quotes', () => {
      expect(sanitizeForDisplay("test'test")).toBe('testtest');
      expect(sanitizeForDisplay("'quoted'")).toBe('quoted');
    });

    it('removes backticks', () => {
      expect(sanitizeForDisplay('test`test')).toBe('testtest');
      expect(sanitizeForDisplay('`quoted`')).toBe('quoted');
    });
  });

  describe('zero-width and RTL attacks', () => {
    it('removes zero-width characters', () => {
      expect(sanitizeForDisplay('test\u200Btest')).toBe('testtest'); // Zero-width space
      expect(sanitizeForDisplay('test\u200Ctest')).toBe('testtest'); // Zero-width non-joiner
      expect(sanitizeForDisplay('test\u200Dtest')).toBe('testtest'); // Zero-width joiner
    });

    it('removes RTL/LTR override characters', () => {
      expect(sanitizeForDisplay('test\u202Etest')).toBe('testtest'); // Right-to-left override
      expect(sanitizeForDisplay('test\u202Atest')).toBe('testtest'); // Left-to-right embedding
    });
  });

  describe('control characters', () => {
    it('removes null bytes', () => {
      expect(sanitizeForDisplay('test\x00test')).toBe('testtest');
    });

    it('removes control characters', () => {
      expect(sanitizeForDisplay('test\x01test')).toBe('testtest');
      expect(sanitizeForDisplay('test\x1Ftest')).toBe('testtest');
      expect(sanitizeForDisplay('test\x7Ftest')).toBe('testtest');
    });
  });

  describe('safe input', () => {
    it('preserves normal text', () => {
      expect(sanitizeForDisplay('Hello World')).toBe('Hello World');
      expect(sanitizeForDisplay('Test 123')).toBe('Test 123');
      expect(sanitizeForDisplay('Normal device name')).toBe('Normal device name');
    });

    it('preserves alphanumeric and common punctuation', () => {
      expect(sanitizeForDisplay('Device-123')).toBe('Device-123');
      expect(sanitizeForDisplay('Test_Device')).toBe('Test_Device');
      expect(sanitizeForDisplay('Device #5')).toBe('Device #5');
      expect(sanitizeForDisplay('Device (old)')).toBe('Device (old)');
    });

    it('trims whitespace', () => {
      expect(sanitizeForDisplay('  test  ')).toBe('test');
      expect(sanitizeForDisplay('\n\ntest\n\n')).toBe('test');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for undefined', () => {
      expect(sanitizeForDisplay(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(sanitizeForDisplay('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizeForDisplay('   ')).toBe('');
      expect(sanitizeForDisplay('\t\n')).toBe('');
    });

    it('handles invalid URL encoding gracefully', () => {
      // Invalid URL encoding should not crash
      expect(sanitizeForDisplay('%ZZ%invalid%')).toBe('%ZZ%invalid%');
    });

    it('blocks scheme even with only colon and no payload', () => {
      expect(sanitizeForDisplay('javascript:')).toBe('');
      expect(sanitizeForDisplay('data:')).toBe('');
      expect(sanitizeForDisplay('vbscript:')).toBe('');
      expect(sanitizeForDisplay('file:')).toBe('');
    });
  });

  describe('combined attacks', () => {
    it('blocks URL scheme even when combined with HTML', () => {
      expect(sanitizeForDisplay('javascript:alert("<script>")')).toBe('');
      expect(sanitizeForDisplay('data:text/html,<img src=x>')).toBe('');
    });

    it('blocks URL scheme even with quotes', () => {
      expect(sanitizeForDisplay('javascript:alert("test")')).toBe('');
      expect(sanitizeForDisplay("javascript:alert('test')")).toBe('');
    });

    it('blocks URL scheme even with control characters', () => {
      expect(sanitizeForDisplay('javascript:alert\x00(1)')).toBe('');
      expect(sanitizeForDisplay('data:\x01text/html')).toBe('');
    });
  });
});
