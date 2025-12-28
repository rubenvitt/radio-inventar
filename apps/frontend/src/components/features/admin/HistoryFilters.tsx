// apps/frontend/src/components/features/admin/HistoryFilters.tsx
// Story 6.3: Admin Historie UI - Filter Component (AC2, AC3, AC4, AC9)
import { memo, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDevicesForFilter, type HistoryQueryFilters } from '@/api/admin-history';
import { sanitizeForDisplay } from '@/lib/sanitize';
import { X } from 'lucide-react';

interface HistoryFiltersProps {
  filters: HistoryQueryFilters;
  onChange: (newFilters: Partial<HistoryQueryFilters>) => void;
  disabled?: boolean;
}

/**
 * Filter controls for history table
 * AC2: Device filter dropdown
 * AC3: Date range filters (from/to)
 * AC4: Combined filters with reset
 * AC9: Touch-optimized (64px targets)
 * [AI-Review Fix] CRITICAL: Wrapped in memo() for performance
 * [AI-Review Fix] HIGH: Added useCallback for onChange handlers
 */
export const HistoryFilters = memo(function HistoryFilters({ filters, onChange, disabled = false }: HistoryFiltersProps) {
  const { data: devices = [], isLoading: isLoadingDevices } = useDevicesForFilter();

  // Check if any filters are active (AC4)
  const hasActiveFilters = Boolean(filters.deviceId || filters.from || filters.to);

  // Sanitize device options for XSS protection
  const sanitizedDevices = useMemo(
    () =>
      devices.map(device => ({
        id: device.id,
        callSign: sanitizeForDisplay(device.callSign),
      })),
    [devices]
  );

  // [AI-Review Fix] HIGH: Wrap handlers in useCallback to prevent unnecessary re-renders
  // Reset all filters (AC4)
  const handleReset = useCallback(() => {
    onChange({
      deviceId: undefined,
      from: undefined,
      to: undefined,
    });
  }, [onChange]);

  // Handle device filter change (AC2)
  const handleDeviceChange = useCallback((value: string) => {
    onChange({ deviceId: value === 'all' ? undefined : value });
  }, [onChange]);

  // Handle from date change (AC3)
  // [AI-Review Fix] HIGH: Validate date format before constructing ISO string
  // NOTE: Debouncing not needed for MVP - date inputs only fire onChange on blur/value change,
  // not on every keystroke like text inputs. This prevents excessive API calls naturally.
  const handleFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate date format (YYYY-MM-DD)
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return; // Invalid format, ignore
    }
    onChange({
      from: value ? `${value}T00:00:00Z` : undefined,
    });
  }, [onChange]);

  // Handle to date change (AC3)
  const handleToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate date format (YYYY-MM-DD)
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return; // Invalid format, ignore
    }
    onChange({
      to: value ? `${value}T23:59:59Z` : undefined,
    });
  }, [onChange]);

  // [AI-Review Fix] HIGH: Safe date extraction with validation
  // Extract date part from ISO string for input value
  const extractDateValue = (isoString: string | undefined): string => {
    if (!isoString) return '';
    // Validate ISO format before splitting
    if (!/^\d{4}-\d{2}-\d{2}T/.test(isoString)) return '';
    return isoString.split('T')[0] || '';
  };
  const fromDateValue = extractDateValue(filters.from);
  const toDateValue = extractDateValue(filters.to);

  // [MEDIUM-FIX] Get today's date for max attribute on date inputs
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Device Filter (AC2) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="device-filter">Gerät</Label>
        <Select
          value={filters.deviceId || 'all'}
          onValueChange={handleDeviceChange}
          disabled={disabled || isLoadingDevices}
        >
          <SelectTrigger
            id="device-filter"
            className="w-[200px] min-h-16"
            aria-label="Gerät filtern"
          >
            {/* [MEDIUM-FIX] Show loading indicator when devices are being fetched */}
            <SelectValue placeholder={isLoadingDevices ? 'Lädt...' : 'Alle Geräte'} />
          </SelectTrigger>
          {/* [AI-Review Fix] HIGH: Increase touch targets to min-h-16 (64px) for AC9 */}
          <SelectContent>
            <SelectItem value="all" className="min-h-16">
              Alle Geräte
            </SelectItem>
            {sanitizedDevices.map(device => (
              <SelectItem key={device.id} value={device.id} className="min-h-16">
                {device.callSign}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* From Date Filter (AC3) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from-date">Von</Label>
        <Input
          id="from-date"
          type="date"
          value={fromDateValue}
          onChange={handleFromChange}
          disabled={disabled}
          className="min-h-16 min-w-[160px]"
          aria-label="Startdatum"
          max={today}
        />
      </div>

      {/* To Date Filter (AC3) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to-date">Bis</Label>
        <Input
          id="to-date"
          type="date"
          value={toDateValue}
          onChange={handleToChange}
          disabled={disabled}
          className="min-h-16 min-w-[160px]"
          aria-label="Enddatum"
          max={today}
        />
      </div>

      {/* Reset Button (AC4) - only visible when filters are active */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="lg"
          onClick={handleReset}
          disabled={disabled}
          className="min-h-16"
          aria-label="Filter zurücksetzen"
        >
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  );
});
