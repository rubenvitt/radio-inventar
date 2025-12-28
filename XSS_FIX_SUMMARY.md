# XSS Security Fix - Dangerous URL Scheme Blocking

## Issue #5: Shallow XSS Tests - Security Vulnerability Fixed

### Problem
The `sanitizeForDisplay()` function in `/apps/frontend/src/lib/sanitize.ts` was not blocking dangerous URL schemes, allowing potential XSS attacks through:
- `javascript:alert(1)` - executed as-is
- `data:text/html,<script>` - only partially sanitized
- `vbscript:msgbox(1)` - not blocked
- `file:///etc/passwd` - not blocked

### Solution Implemented

#### 1. Enhanced `sanitizeForDisplay()` Function
**File:** `/apps/frontend/src/lib/sanitize.ts`

**Changes:**
- Added dangerous URL scheme detection (javascript:, data:, vbscript:, file:)
- Implemented case-insensitive matching (JavaScript:, JAVASCRIPT:, etc.)
- Added URL-decoding to catch encoded attacks (%6A%61%76%61%73%63%72%69%70%74%3A)
- Returns empty string when dangerous scheme detected (complete blocking)

**Security Features:**
```typescript
// Decodes URL-encoded characters
decodeURIComponent(text)

// Regex pattern matches dangerous schemes (case-insensitive)
/^[\s\x00-\x1F\x7F]*(javascript|data|vbscript|file):/i

// Checks both original AND decoded text
if (dangerousSchemes.test(text) || dangerousSchemes.test(decodedText)) {
  return '';
}
```

#### 2. Comprehensive Unit Tests
**File:** `/apps/frontend/src/lib/sanitize.spec.ts` (NEW)

**Test Coverage (37 tests):**
- ✅ javascript: URLs (basic, case variations, leading whitespace, control chars, URL-encoded)
- ✅ data: URLs (basic, case variations, base64, URL-encoded)
- ✅ vbscript: URLs (basic, case variations, URL-encoded)
- ✅ file: URLs (basic, case variations, URL-encoded)
- ✅ Mixed obfuscation (partial encoding, case + encoding)
- ✅ HTML injection (tags, angle brackets)
- ✅ Quote escaping (double, single, backticks)
- ✅ Zero-width and RTL attacks
- ✅ Control characters
- ✅ Safe input preservation
- ✅ Edge cases (undefined, empty, whitespace, invalid encoding)
- ✅ Combined attacks

#### 3. Updated Integration Tests
**File:** `/apps/frontend/src/components/features/admin/DeviceFormDialog.spec.tsx`

**Updated Tests:**
- ✅ `sanitizes javascript: URLs in device names` - now expects empty string
- ✅ `sanitizes data URIs in device names` - now expects empty string
- ✅ `sanitizes vbscript: URLs in device names` (NEW)
- ✅ `sanitizes file: URLs in device names` (NEW)
- ✅ `sanitizes case-insensitive dangerous URL schemes` (NEW)
- ✅ `sanitizes URL-encoded dangerous schemes` (NEW)

### Test Results

#### Unit Tests (sanitize.spec.ts)
```
✓ 37 tests passed
  - dangerous URL schemes: 23 tests
  - HTML injection: 3 tests
  - quote escaping: 3 tests
  - zero-width and RTL attacks: 2 tests
  - control characters: 3 tests
  - safe input: 3 tests
```

#### Integration Tests (DeviceFormDialog.spec.tsx)
```
✓ 74 tests passed (all existing + 4 new XSS tests)
```

### Expected Behavior

```typescript
// Dangerous URL schemes → completely blocked
sanitizeForDisplay('javascript:alert(1)')       // → ''
sanitizeForDisplay('JAVASCRIPT:alert(1)')      // → ''
sanitizeForDisplay('data:text/html,<script>')  // → ''
sanitizeForDisplay('vbscript:msgbox(1)')       // → ''
sanitizeForDisplay('file:///etc/passwd')       // → ''

// URL-encoded attacks → decoded and blocked
sanitizeForDisplay('%6A%61%76%61%73%63%72%69%70%74%3Aalert(1)') // → ''

// Safe text → preserved
sanitizeForDisplay('Normal Text')      // → 'Normal Text'
sanitizeForDisplay('Device-123')       // → 'Device-123'

// HTML tags → stripped (existing behavior)
sanitizeForDisplay('<script>alert("xss")</script>') // → 'scriptalert(xss)/script'
```

### Security Impact

**Before:**
- ❌ javascript: URLs could execute arbitrary code
- ❌ data: URLs could load malicious HTML
- ❌ vbscript: URLs could execute VBScript (IE)
- ❌ file: URLs could access local files
- ❌ URL-encoded variants bypassed detection

**After:**
- ✅ All dangerous URL schemes completely blocked
- ✅ Case-insensitive detection
- ✅ URL-encoded attack prevention
- ✅ Empty string returned (safe fallback)
- ✅ Comprehensive test coverage

### Files Changed
1. `/apps/frontend/src/lib/sanitize.ts` - Enhanced function
2. `/apps/frontend/src/lib/sanitize.spec.ts` - New comprehensive tests (37 tests)
3. `/apps/frontend/src/components/features/admin/DeviceFormDialog.spec.tsx` - Updated expectations + 4 new tests

### Verification
All tests passing:
- ✅ 37/37 unit tests in sanitize.spec.ts
- ✅ 74/74 integration tests in DeviceFormDialog.spec.tsx
