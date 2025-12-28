# Manual Testing Guide - LoanPage Integration (Story 3.4)

## Overview
This document describes manual testing procedures for the LoanPage integration features implemented in Story 3.4.

## Prerequisites
- Backend API running on `http://localhost:3000`
- Frontend dev server running on `http://localhost:5173`
- At least one available device in the database

## Test Cases

### TC1: Success Flow - Happy Path (AC#3, AC#4)

**Purpose:** Verify that successful loan creation shows success message and redirects to overview.

**Steps:**
1. Navigate to `/loan` page
2. Click on an available device card to select it
3. Verify smooth scroll to borrower input section
4. Enter a valid name (minimum 2 characters) in the borrower input field
5. Click the "Ausleihen" button
6. Verify success message appears:
   - Green checkmark icon visible
   - "Ausleihe erfolgreich!" heading displayed
   - Device callSign displayed (e.g., "F4-21")
   - Borrower name displayed
   - "Weiterleitung zur Übersicht..." message visible
7. Wait 2 seconds
8. Verify automatic redirect to overview page (`/`)

**Expected Result:**
- Success message displays correctly with all information
- Automatic redirect occurs after 2 seconds
- Device appears as "ON_LOAN" in overview

---

### TC2: Error Handling - API Error (AC#5)

**Purpose:** Verify error display and form state persistence after API errors.

**Setup:** Stop the backend API or use a device that's already on loan.

**Steps:**
1. Navigate to `/loan` page
2. Select a device that's already on loan
3. Enter a borrower name
4. Click "Ausleihen" button
5. Verify error message appears:
   - Red alert icon visible
   - "Fehler beim Ausleihen" heading
   - User-friendly error message displayed
   - "Erneut versuchen" button visible
   - "Schließen" button visible
6. Verify form state is preserved:
   - Device selection still visible
   - Borrower name still in input field
   - Confirm button still visible

**Expected Result:**
- Error message displays correctly
- Form remains intact for retry
- No data loss

---

### TC3: Error Handling - 409 Conflict (AC#8, AC#9)

**Purpose:** Verify specific error message for 409 Conflict responses.

**Steps:**
1. Navigate to `/loan` page
2. Select an available device
3. Enter a borrower name
4. Click "Ausleihen" button
5. In another tab/window, create a loan for the same device
6. In the first tab, click "Ausleihen" again (or "Erneut versuchen" if error already occurred)
7. Verify error message displays:
   "Dieses Gerät ist bereits ausgeliehen oder nicht verfügbar."

**Expected Result:**
- Specific, user-friendly error message for 409 conflict
- No technical error details exposed to user

---

### TC4: Error Recovery - Retry Button (AC#5)

**Purpose:** Verify retry functionality clears error state.

**Steps:**
1. Trigger an error (use TC2 or TC3 setup)
2. Verify error message is displayed
3. Click "Erneut versuchen" button
4. Verify:
   - Error message is cleared/hidden
   - Form is still visible and intact
   - User can modify input and retry

**Expected Result:**
- Error message disappears
- Form remains usable
- User can attempt another submission

---

### TC5: Error Recovery - Dismiss Button (AC#5)

**Purpose:** Verify dismiss functionality clears error state.

**Steps:**
1. Trigger an error (use TC2 or TC3 setup)
2. Verify error message is displayed
3. Click "Schließen" button
4. Verify:
   - Error message is cleared/hidden
   - Form is still visible and intact

**Expected Result:**
- Error message disappears
- Form remains usable

---

### TC6: Component Integration - ConfirmLoanButton Rendering (AC#1, AC#2)

**Purpose:** Verify ConfirmLoanButton renders only when device is selected.

**Steps:**
1. Navigate to `/loan` page
2. Verify "Ausleihen" button is NOT visible
3. Select a device
4. Verify "Ausleihen" button becomes visible in Section 3
5. Verify button is disabled when borrower name is empty or < 2 characters
6. Enter a valid name (≥ 2 characters)
7. Verify button is enabled

**Expected Result:**
- Button only appears after device selection
- Button disabled state follows validation rules
- Button receives correct props (deviceId, borrowerName, callbacks)

---

### TC7: XSS Protection

**Purpose:** Verify sanitization of user input in success display.

**Steps:**
1. Navigate to `/loan` page
2. Select a device
3. Enter a borrower name with special characters: `<script>alert("xss")</script>Tim`
4. Create loan successfully
5. Inspect success message

**Expected Result:**
- Dangerous characters are removed/escaped
- No script execution occurs
- Display shows sanitized text without HTML tags

---

### TC8: Navigation - Back Button

**Purpose:** Verify back navigation works correctly.

**Steps:**
1. Navigate to `/loan` page
2. Click "Zurück zur Übersicht" button
3. Verify redirect to overview page (`/`)

**Expected Result:**
- Navigation works immediately
- No errors in console

---

### TC9: Device Selection - Toggle Behavior

**Purpose:** Verify device selection toggle functionality.

**Steps:**
1. Navigate to `/loan` page
2. Click on a device card to select it
3. Verify device is highlighted/selected
4. Click on the same device card again
5. Verify device is deselected
6. Verify borrower input section is no longer visible

**Expected Result:**
- Clicking same device toggles selection off
- UI updates accordingly

---

### TC10: Accessibility - Screen Reader

**Purpose:** Verify accessibility features.

**Steps:**
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to `/loan` page
3. Verify announcements for:
   - Section headings ("1. Gerät auswählen", "2. Name eingeben", "3. Ausleihe bestätigen")
   - Success message (role="status", aria-live="polite")
   - Error message (role="alert", aria-live="assertive")

**Expected Result:**
- All interactive elements are accessible
- Proper ARIA labels and roles
- Screen reader announces state changes

---

## Test Data Recommendations

### Available Devices
- Have at least 3 available devices for selection testing
- Have at least 1 device already on loan for 409 error testing

### Borrower Names
- Valid: "Tim Schmidt", "Anna Müller", "Jo" (2 chars minimum)
- Invalid: "T" (1 char), "" (empty)
- XSS Test: "<script>alert('xss')</script>Tim", "<img src=x onerror=alert(1)>Anna"

## Performance Expectations

- Device selection should scroll smoothly (no jank)
- API requests should complete within 2 seconds under normal conditions
- Success redirect delay: exactly 2 seconds
- Error display should be immediate (< 100ms)

## Browser Compatibility

Test in:
- Chrome/Chromium (primary)
- Firefox
- Safari (especially for iOS touch interactions)

## Known Limitations

- Integration tests for Router components are complex and time-consuming
- Manual testing required for full E2E validation
- Automated tests cover individual components but not full page integration
