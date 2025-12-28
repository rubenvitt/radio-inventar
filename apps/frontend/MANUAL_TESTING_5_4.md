# Manual Testing Guide - Admin Device Management (Story 5.4)

## Overview
This document describes manual testing procedures for the Admin Device Management UI implemented in Story 5.4.

## Prerequisites
- Backend API running on `http://localhost:3000`
- Frontend dev server running on `http://localhost:5173`
- Admin logged in (Story 5.2 credentials)
- At least 2-3 devices in the database (mix of AVAILABLE, ON_LOAN, DEFECT)

## Test Cases

### TC1: Device List View (AC1)

**Purpose:** Verify device table displays correctly with all columns.

**Steps:**
1. Log in as admin
2. Navigate to `/admin` dashboard
3. Click "Geräte" navigation link
4. Verify page loads at `/admin/devices`
5. Verify table displays with columns:
   - Rufname
   - Seriennummer
   - Gerätetyp
   - Status (with colored badges)
   - Aktionen (Edit/Delete buttons)

**Expected Result:**
- All devices displayed in table
- Status badges show correct colors:
  - Verfügbar (Green)
  - Ausgeliehen (Orange)
  - Defekt (Red)
  - Wartung (Gray)
- Serial numbers display in monospace font
- Actions column shows edit (pencil) and delete (trash) icons

---

### TC2: Create New Device (AC2)

**Purpose:** Verify device creation flow works correctly.

**Steps:**
1. On `/admin/devices` page
2. Click "Neues Gerät" button in header
3. Verify dialog opens with title "Neues Gerät"
4. Fill in form:
   - Rufname: "F4-99" (required)
   - Seriennummer: "SN123456" (optional)
   - Gerätetyp: "Motorola XTN446" (required)
   - Notizen: "Test device for manual testing" (optional)
5. Verify character counter for Notizen field shows correct count
6. Click "Erstellen" button
7. Verify success toast: "Gerät erfolgreich erstellt"
8. Verify dialog closes
9. Verify new device appears in table

**Expected Result:**
- Form validation works (required fields enforced)
- Device created successfully
- Table updates with new device
- New device shows AVAILABLE status by default

---

### TC3: Edit Existing Device (AC3)

**Purpose:** Verify device editing flow works correctly.

**Steps:**
1. On `/admin/devices` page
2. Click edit button (pencil icon) on any device row
3. Verify dialog opens with title "Gerät bearbeiten"
4. Verify form pre-filled with existing values
5. Modify one or more fields:
   - Change Rufname to "F4-99-UPDATED"
   - Add/modify Notizen
6. Click "Speichern" button
7. Verify success toast: "Gerät erfolgreich aktualisiert"
8. Verify dialog closes
9. Verify table shows updated values

**Expected Result:**
- Form pre-fills correctly in edit mode
- Changes saved successfully
- Table reflects updates immediately
- Optimistic update shows changes before API response

---

### TC4: Change Device Status (AC4)

**Purpose:** Verify inline status change works correctly.

**Steps:**
1. On `/admin/devices` page
2. Find a device with status AVAILABLE
3. Click on status dropdown for that device
4. Select "Defekt" from dropdown
5. Verify loading spinner appears briefly
6. Verify status badge updates to "Defekt" (red)
7. Verify no page reload occurs
8. Change status back to "Verfügbar"
9. Verify badge updates to green

**Expected Result:**
- Status changes immediately (optimistic update)
- Loading spinner visible during API call
- No page reload
- Status dropdown disabled during update
- Changes persist after page refresh

---

### TC5: Delete Device with Confirmation (AC5)

**Purpose:** Verify delete confirmation flow.

**Steps:**
1. On `/admin/devices` page
2. Find device with status AVAILABLE
3. Click delete button (trash icon)
4. Verify AlertDialog opens with:
   - Title: "Gerät '[DeviceName]' löschen?"
   - Warning: "Diese Aktion kann nicht rückgängig gemacht werden."
   - Buttons: "Abbrechen" and "Löschen" (red/destructive)
5. Click "Abbrechen"
6. Verify dialog closes without deleting
7. Click delete button again
8. In dialog, click "Löschen"
9. Verify loading state on delete button
10. Verify success toast
11. Verify device removed from table

**Expected Result:**
- Confirmation dialog prevents accidental deletion
- Cancel works correctly
- Delete removes device from database
- Table updates immediately
- Toast notification confirms deletion

---

### TC6: ON_LOAN Delete Protection (AC6)

**Purpose:** Verify devices on loan cannot be deleted.

**Steps:**
1. On `/admin/devices` page
2. Find device with status ON_LOAN (Ausgeliehen)
3. Verify delete button (trash icon) is disabled
4. Hover over disabled delete button
5. Verify tooltip appears: "Ausgeliehenes Gerät kann nicht gelöscht werden"
6. Verify status dropdown is disabled for ON_LOAN device
7. Attempt to click disabled delete button
8. Verify no dialog opens

**Expected Result:**
- Delete button visually disabled for ON_LOAN devices
- Tooltip clearly explains why deletion is disabled
- Status cannot be changed via dropdown for ON_LOAN
- Protection works even if button is clicked

---

### TC7: Touch-Optimized Interface (AC7)

**Purpose:** Verify interface works on tablet with touch targets >= 44px.

**Setup:** Open browser developer tools, switch to tablet viewport (768px width)

**Steps:**
1. Navigate to `/admin/devices` on tablet viewport
2. Verify all buttons are easily tappable:
   - "Neues Gerät" button
   - Refresh button
   - Edit buttons in table rows
   - Delete buttons in table rows
   - Status dropdowns
3. Click each button type to verify no mis-clicks
4. Open device form dialog
5. Verify all form inputs have adequate touch targets
6. Verify dialog buttons are touch-friendly

**Expected Result:**
- All interactive elements >= 44x44px (min-h-11, min-w-11)
- No difficulty tapping buttons
- Buttons have adequate spacing
- Form inputs easy to focus and type in
- Dropdown menus work smoothly on touch

---

### TC8: Error Handling - Network Error (AC8)

**Purpose:** Verify error handling for network failures.

**Setup:** Stop the backend API server

**Steps:**
1. On `/admin/devices` page
2. Try to create a new device
3. Fill form and click "Erstellen"
4. Verify error toast appears with German message
5. Verify toast has retry action button
6. Restart backend API
7. Click retry button in toast (or in toast action)
8. Verify device creates successfully

**Expected Result:**
- Network errors show user-friendly German message
- Toast displays: "Der Server ist momentan nicht erreichbar..."
- Retry option available
- Form data not lost during error
- Successful retry after server restart

---

### TC9: Error Handling - 409 Conflict (AC8)

**Purpose:** Verify error handling for conflict errors.

**Setup:** Have a device with duplicate callSign attempt

**Steps:**
1. On `/admin/devices` page
2. Note an existing device callSign (e.g., "F4-21")
3. Click "Neues Gerät"
4. Enter the same callSign as existing device
5. Fill other required fields
6. Click "Erstellen"
7. Verify error toast: "Funkruf existiert bereits..."
8. Verify form remains open for correction
9. Change callSign to unique value
10. Retry submission

**Expected Result:**
- 409 error shows specific German message
- Message explains conflict clearly
- Form data preserved for correction
- User can modify and resubmit
- No technical error details exposed

---

### TC10: Error Handling - Validation Errors (AC8)

**Purpose:** Verify client-side validation works.

**Steps:**
1. On `/admin/devices` page
2. Click "Neues Gerät"
3. Leave Rufname empty
4. Leave Gerätetyp empty
5. Try to click "Erstellen"
6. Verify validation errors appear:
   - Red border on invalid fields
   - Error messages below fields
   - aria-invalid and aria-describedby attributes set
7. Fill Rufname field
8. Verify error clears for that field immediately
9. Enter Notizen exceeding 500 characters
10. Verify character counter turns red
11. Verify validation error for Notizen

**Expected Result:**
- Required fields validated before submission
- Field-level error messages clear and German
- Errors clear as user types
- Character limits enforced
- Accessibility attributes correct (aria-invalid, aria-describedby)

---

### TC11: Empty State (AC1)

**Purpose:** Verify empty state displays correctly.

**Setup:** Delete all devices or use fresh database

**Steps:**
1. On `/admin/devices` page with no devices
2. Verify empty state displays:
   - Radio icon
   - Message: "Keine Geräte vorhanden"
   - "Neues Gerät" button
3. Click "Neues Gerät" button from empty state
4. Create a device
5. Verify table replaces empty state

**Expected Result:**
- Empty state is visually appealing
- Clear call-to-action to add first device
- No table headers shown when empty
- Smooth transition from empty to populated

---

### TC12: Loading States (AC1, AC4)

**Purpose:** Verify loading indicators work correctly.

**Steps:**
1. On `/admin/devices` page
2. Hard refresh page (Cmd+Shift+R)
3. Verify skeleton loading state shows:
   - 5 skeleton rows with animated shimmer
   - Skeleton cells for all columns
4. Wait for data to load
5. Verify skeleton replaced with real data
6. Click refresh button in header
7. Verify subtle "Aktualisiere..." indicator at bottom
8. Verify table remains visible during background refresh

**Expected Result:**
- Initial load shows skeleton screens
- Background refresh shows subtle indicator
- No jarring layout shifts
- Data updates smoothly
- Loading indicators accessible (aria-label, sr-only text)

---

### TC13: Optimistic Updates (AC3, AC4)

**Purpose:** Verify optimistic updates work and rollback on error.

**Steps:**
1. On `/admin/devices` page
2. Disconnect network or stop backend
3. Change device status via dropdown
4. Verify status updates immediately (optimistic)
5. After API fails, verify status reverts to original
6. Reconnect network
7. Try status change again
8. Verify optimistic update sticks after successful API call

**Expected Result:**
- UI updates immediately before API response
- Changes feel instant and smooth
- Rollback occurs on API error
- User notified of rollback via toast
- No inconsistent UI state

---

### TC14: Multiple Operations in Sequence

**Purpose:** Verify multiple CRUD operations work correctly.

**Steps:**
1. Create 3 new devices
2. Edit 2 of them
3. Change status of 1 device
4. Delete 1 device
5. Verify table state is consistent
6. Refresh page
7. Verify all changes persisted correctly

**Expected Result:**
- All operations complete successfully
- No race conditions or conflicts
- Table updates correctly after each operation
- Data persists across page refresh
- No duplicate entries or stale data

---

### TC15: Navigation and Routing (AC1)

**Purpose:** Verify navigation to/from device management works.

**Steps:**
1. From `/admin` dashboard, click "Geräte" link
2. Verify URL changes to `/admin/devices`
3. Verify page title: "Geräteverwaltung"
4. Click browser back button
5. Verify return to dashboard
6. Verify forward button returns to devices page
7. Directly navigate to `/admin/devices` via URL bar
8. Verify page loads correctly

**Expected Result:**
- Navigation works smoothly
- URLs update correctly
- Browser back/forward work
- Direct URL access works
- Protected route (admin auth required)

---

### TC16: Accessibility - Keyboard Navigation

**Purpose:** Verify keyboard-only navigation works.

**Steps:**
1. On `/admin/devices` page
2. Press Tab to navigate through interactive elements
3. Verify focus visible on:
   - "Neues Gerät" button
   - Refresh button
   - Edit buttons
   - Delete buttons
   - Status dropdowns
4. Navigate to edit button, press Enter
5. Verify dialog opens
6. Tab through form fields
7. Press Escape to close dialog
8. Verify dialog closes and focus returns

**Expected Result:**
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Tab order logical (left-to-right, top-to-bottom)
- Enter/Space activate buttons
- Escape closes dialogs
- Focus management correct (dialog trap, return focus)

---

### TC17: Accessibility - Screen Reader

**Purpose:** Verify screen reader compatibility.

**Setup:** Enable VoiceOver (Mac) or NVDA (Windows)

**Steps:**
1. Navigate to `/admin/devices` with screen reader
2. Verify announcements for:
   - Page heading "Geräteverwaltung"
   - Table headers announced correctly
   - Status badges have accessible labels
   - Button labels clear (e.g., "F4-21 bearbeiten")
   - Toast notifications announced
3. Open device form dialog
4. Verify form labels announced
5. Verify validation errors announced
6. Create/edit device
7. Verify success toast announced

**Expected Result:**
- All content accessible via screen reader
- Semantic HTML used correctly
- ARIA labels and roles appropriate
- Announcements clear and German
- State changes announced (aria-live)

---

### TC18: XSS Protection

**Purpose:** Verify XSS protection via sanitization.

**Steps:**
1. Create device with XSS attempt in fields:
   - Rufname: `<script>alert('xss')</script>F4-XSS`
   - Notizen: `<img src=x onerror=alert(1)>Test`
2. Verify device created
3. View device in table
4. Verify no script execution
5. Edit device
6. Verify form shows sanitized text
7. Delete device
8. Verify dialog shows sanitized callSign

**Expected Result:**
- No JavaScript execution
- Dangerous HTML tags stripped/escaped
- Display shows plain text only
- No console errors from XSS attempts
- sanitizeForDisplay() function works correctly

---

## Test Data Recommendations

### Device Examples
```
Rufname: F4-21, F4-22, F4-23, F5-01
Seriennummer: SN123456, SN789012 (optional)
Gerätetyp: Motorola XTN446, Motorola GP344, Kenwood TK-3401
Status: Mix of AVAILABLE, ON_LOAN, DEFECT, MAINTENANCE
Notizen: "Batterie schwach", "Neu bestellt" (optional)
```

### Edge Cases to Test
- Very long callSign (50 chars): "F4-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890-ABCDEFGH"
- Very long serial number (100 chars)
- Very long device type (100 chars)
- Notizen at exactly 500 chars
- Special characters: umlauts (ä, ö, ü, ß), symbols (@, #, $, %)
- Empty optional fields (serialNumber, notes)

## Performance Expectations

- Initial page load: < 1 second (with 100 devices)
- Device creation: < 500ms API response
- Status change: < 300ms API response
- Delete operation: < 500ms API response
- Table rendering: No jank with 100+ devices
- Optimistic updates: Immediate UI response (< 50ms)

## Browser Compatibility

Test in:
- Chrome/Chromium (primary) - latest version
- Firefox - latest version
- Safari - latest version (especially for iOS tablet testing)
- Edge - latest version

## Known Limitations

- ON_LOAN status cannot be set via admin UI (managed by loan system)
- Device deletion permanently removes device (no soft delete)
- No bulk operations (select multiple, bulk delete)
- No device search/filter functionality yet (future story)
- Table pagination not yet implemented (loads all devices)

## Success Criteria

✅ All test cases pass
✅ No TypeScript compilation errors
✅ All 249 unit tests pass
✅ No console errors or warnings
✅ Touch targets >= 44x44px on tablet
✅ Keyboard and screen reader accessible
✅ German error messages user-friendly
✅ XSS protection working
