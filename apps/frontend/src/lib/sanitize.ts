/**
 * Sanitizes text for safe display to prevent XSS attacks.
 *
 * Security checks:
 * 1. Blocks dangerous URL schemes (javascript:, data:, vbscript:, file:) - returns empty string if detected
 * 2. Removes HTML tags (<, >) - prevents HTML injection
 * 3. Removes quotes (", ', `) - prevents attribute escaping attacks
 * 4. Removes zero-width/RTL characters (U+200B-U+200F, U+202A-U+202E) - prevents text direction attacks
 * 5. Removes control characters (0x00-0x1F, 0x7F) - prevents control char injection
 *
 * @param text - The text to sanitize (can be undefined)
 * @returns Sanitized text, or empty string if input is undefined/null or contains dangerous URL schemes
 *
 * @example
 * sanitizeForDisplay('<script>alert("xss")</script>') // 'scriptalert(xss)/script'
 * sanitizeForDisplay('javascript:alert(1)') // ''
 * sanitizeForDisplay('data:text/html,<script>') // ''
 * sanitizeForDisplay('Hello World') // 'Hello World'
 * sanitizeForDisplay(undefined) // ''
 */
export function sanitizeForDisplay(text: string | undefined): string {
  if (!text) return '';

  // Decode URL-encoded characters to catch obfuscated URL schemes
  let decodedText = text;
  try {
    decodedText = decodeURIComponent(text);
  } catch {
    // If decoding fails, use original text
    decodedText = text;
  }

  // Check for dangerous URL schemes (case-insensitive, in both original and decoded text)
  const dangerousSchemes = /^[\s\x00-\x1F\x7F]*(javascript|data|vbscript|file):/i;
  if (dangerousSchemes.test(text) || dangerousSchemes.test(decodedText)) {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // HTML Injection
    .replace(/["'`]/g, '') // Attribute Escaping
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, '') // Zero-Width/RTL Attacks
    .replace(/[\x00-\x1F\x7F]/g, '') // Control Chars
    .trim();
}
