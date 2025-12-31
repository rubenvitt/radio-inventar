import {
  useState,
  useRef,
  useCallback,
  useDeferredValue,
  useId,
  useEffect,
} from 'react';
import {
  useBorrowerSuggestions,
  type BorrowerSuggestion,
} from '@/api/borrowers';
import { getUserFriendlyErrorMessage } from '@/lib/error-messages';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { sanitizeForDisplay } from '@/lib/sanitize';

interface BorrowerInputProps {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

// Constants
const MIN_QUERY_LENGTH = 2;
const SUGGESTION_BLUR_DELAY_MS = 200; // Allow click/touch to register before closing

/**
 * BorrowerInput - Autocomplete input for borrower names.
 *
 * Features:
 * - Autocomplete suggestions after 2 characters (AC#1, AC#2)
 * - Click/touch to select suggestion (AC#3)
 * - Free text entry without forcing suggestion (AC#4)
 * - Touch-optimized: 56px input height (AC#5, NFR11)
 * - Touch-optimized: 44px suggestion items (AC#6)
 * - Disabled when no device selected (AC#7)
 * - Full keyboard navigation (AC#8)
 * - Complete ARIA combobox pattern (AC#9)
 * - XSS protection via sanitization
 */
export function BorrowerInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
}: BorrowerInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IDs for ARIA - AC#9
  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  // Debounce: ~300ms via useDeferredValue - AC#1
  const deferredQuery = useDeferredValue(value);

  // API Hook - AC#2
  const {
    data: suggestions = [],
    isLoading,
    isFetched,
    error,
    refetch,
  } = useBorrowerSuggestions(deferredQuery);

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus when requested - Task 7.4
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Determine if suggestions should be shown
  // Show dropdown if: query >= MIN_QUERY_LENGTH chars AND (has data OR loading OR error OR fetched with empty results)
  // Use Boolean() to ensure type is boolean, not Error|boolean
  const shouldShowSuggestions = Boolean(
    showSuggestions &&
    !disabled &&
    deferredQuery.length >= MIN_QUERY_LENGTH &&
    (suggestions.length > 0 || isLoading || error || isFetched)
  );

  // Handle input change - AC#1, AC#4
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle suggestion selection - AC#3
  const handleSelectSuggestion = useCallback(
    (suggestion: BorrowerSuggestion) => {
      onChange(sanitizeForDisplay(suggestion.name));
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  // Keyboard navigation - AC#8
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Escape regardless of suggestions visibility
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        return;
      }

      // Only handle navigation keys when suggestions are visible
      if (!shouldShowSuggestions || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            const selected = suggestions[highlightedIndex];
            if (selected) {
              handleSelectSuggestion(selected);
            }
          }
          break;
        case 'Tab':
          // Close dropdown on Tab, let default behavior proceed
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
        case 'Home':
          if (suggestions.length > 0) {
            e.preventDefault();
            setHighlightedIndex(0);
          }
          break;
        case 'End':
          if (suggestions.length > 0) {
            e.preventDefault();
            setHighlightedIndex(suggestions.length - 1);
          }
          break;
      }
    },
    [shouldShowSuggestions, suggestions, highlightedIndex, handleSelectSuggestion]
  );

  // Handle blur with delay to allow click on suggestion
  const handleBlur = useCallback(() => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    // Delay to allow click on suggestion to fire first
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), SUGGESTION_BLUR_DELAY_MS);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      {/* Input - AC#5: min-height 56px, AC#9: ARIA combobox */}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={shouldShowSuggestions}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined
        }
        aria-busy={isLoading}
        aria-label="Helfername eingeben"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Name eingeben..."
        className={cn(
          'w-full min-h-[56px] px-4 py-3 text-lg',
          'rounded-lg border border-input bg-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'placeholder:text-muted-foreground'
        )}
      />

      {/* Suggestions Dropdown - AC#6: 44px items, AC#9: ARIA listbox */}
      {shouldShowSuggestions && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Namensvorschläge"
          className={cn(
            'absolute z-50 w-full mt-1',
            'max-h-[300px] overflow-y-auto',
            'rounded-lg border bg-popover shadow-lg'
          )}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 flex items-center justify-center" role="status">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span className="sr-only">Vorschläge werden geladen...</span>
            </div>
          )}

          {/* Error State with Retry */}
          {error && !isLoading && (
            <div className="p-4 text-center text-sm">
              <p className="text-destructive">
                {getUserFriendlyErrorMessage(error)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-primary underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && suggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Keine Vorschläge gefunden
            </div>
          )}

          {/* Suggestion Items - AC#6: 44px min-height */}
          {!isLoading &&
            !error &&
            suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.name}-${suggestion.lastUsed}`}
                id={getOptionId(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'px-4 py-3 min-h-[44px] cursor-pointer',
                  'flex items-center justify-between',
                  'transition-colors duration-100',
                  index === highlightedIndex &&
                    'bg-accent border-l-2 border-primary',
                  index !== highlightedIndex && 'hover:bg-accent/50'
                )}
              >
                <span className="font-medium">
                  {sanitizeForDisplay(suggestion.name)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(suggestion.lastUsed)}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Screen Reader Announcement - AC#9 */}
      {shouldShowSuggestions && !isLoading && !error && (
        <div aria-live="polite" className="sr-only">
          {suggestions.length === 0
            ? 'Keine Vorschläge gefunden'
            : `${suggestions.length} Vorschläge verfügbar`}
        </div>
      )}
    </div>
  );
}
