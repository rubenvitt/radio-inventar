import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import { CreateLoanSchema, DeviceStatusEnum, LOAN_FIELD_LIMITS } from '@radio-inventar/shared';
import { apiClient } from './client';
import { loanKeys, deviceKeys, borrowerKeys } from '@/lib/queryKeys';

/** Error messages - keine Details nach außen (Security) */
const ERROR_MESSAGES = {
  INVALID_INPUT: 'Ungültige Eingabedaten',
  INVALID_RESPONSE: 'Ungültige Server-Antwort',
} as const;

/**
 * Zod schema for ActiveLoan - validates API response structure
 */
export const ActiveLoanSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  borrowerName: z.string(),
  borrowedAt: z.string(),
  device: z.object({
    id: z.string(),
    callSign: z.string(),
    status: DeviceStatusEnum,
  }),
});

/**
 * Zod schema for API response wrapper
 */
const ActiveLoansResponseSchema = z.object({
  data: z.array(ActiveLoanSchema),
});

// ActiveLoan type inferred from schema
export type ActiveLoan = z.infer<typeof ActiveLoanSchema>;

/**
 * Fetches all active loans from the API with Zod validation
 */
async function fetchActiveLoans(): Promise<ActiveLoan[]> {
  const response = await apiClient.get<unknown>('/api/loans/active');

  const validated = ActiveLoansResponseSchema.safeParse(response);
  if (!validated.success) {
    throw new Error('Invalid loans API response format');
  }

  return validated.data.data;
}

/**
 * Hook to fetch all active loans.
 * Active loans are loans that have been borrowed but not yet returned.
 */
export function useActiveLoans() {
  return useQuery({
    queryKey: loanKeys.active(),
    queryFn: fetchActiveLoans,
  });
}

// === STORY 4.2: useMyLoans Hook ===

/** Minimum characters required for filtering (AC#1: "ab 2 Zeichen") */
export const MIN_FILTER_LENGTH = 2;

/**
 * Hook to fetch and filter active loans by borrower name.
 * Performs client-side filtering of all active loans.
 *
 * @param borrowerName - Name to filter by (case-insensitive, partial match)
 * @returns Filtered list of loans matching the borrower name
 *
 * Task 1.1: New hook for filtered loans
 * Task 1.2: Client-side filtering by borrowerName (case-insensitive)
 * Task 1.3: Only enabled when borrowerName.length >= 2 (AC#1)
 */
export function useMyLoans(borrowerName: string) {
  const { data: allLoans, ...rest } = useActiveLoans();

  const filteredLoans = useMemo(() => {
    const trimmed = borrowerName.trim();
    if (trimmed.length < MIN_FILTER_LENGTH) return [];
    const normalizedName = trimmed.toLowerCase();
    return allLoans?.filter(loan =>
      loan.borrowerName.toLowerCase().includes(normalizedName)
    ) ?? [];
  }, [allLoans, borrowerName]);

  return { data: filteredLoans, ...rest };
}

// === STORY 3.4: useCreateLoan Hook ===

/**
 * Response Schema for POST /api/loans - Backend wraps in { data: ... }
 * HINWEIS: Das Backend gibt borrowedAt als ISO-String zurück, nicht als Date
 *
 * H1: Uses shared package schemas as base, extends with backend response wrapper
 */
const CreateLoanResponseSchema = z.object({
  data: z.object({
    id: z.string().cuid2(),
    deviceId: z.string().cuid2(),
    borrowerName: z.string(),
    borrowedAt: z.string().datetime(), // ISO String vom Backend
    device: z.object({
      id: z.string().cuid2(),
      callSign: z.string(),
      status: DeviceStatusEnum,
    }),
  }),
});

export type CreateLoanResponse = z.infer<typeof CreateLoanResponseSchema>['data'];

interface CreateLoanInput {
  deviceId: string;
  borrowerName: string;
}

// === STORY 4.3: Return Device Validation Schemas ===

/**
 * Input Schema for returnDevice - validates payload before sending to API
 * H1: Input validation to prevent invalid data from reaching the backend
 */
const ReturnDevicePayloadSchema = z.object({
  loanId: z.string().min(1),
  returnNote: z.string().max(LOAN_FIELD_LIMITS.RETURN_NOTE_MAX).nullable().optional(),
});

/**
 * Response Schema for PATCH /api/loans/:id - Backend wraps in { data: ... }
 * C2: Response validation to ensure backend returns expected data structure
 */
const ReturnDeviceResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    deviceId: z.string(),
    borrowerName: z.string(),
    borrowedAt: z.string(),
    returnedAt: z.string(),
    returnNote: z.string().nullable(),
    device: z.object({
      id: z.string(),
      callSign: z.string(),
      status: DeviceStatusEnum,
    }),
  }),
});

/**
 * Creates a new loan via POST /api/loans
 */
async function createLoan(input: CreateLoanInput): Promise<CreateLoanResponse> {
  // H2: Validate input before sending to API
  const inputValidation = CreateLoanSchema.safeParse(input);
  if (!inputValidation.success) {
    throw new Error(ERROR_MESSAGES.INVALID_INPUT);
  }

  const response = await apiClient.post<unknown>('/api/loans', inputValidation.data);

  const validated = CreateLoanResponseSchema.safeParse(response);
  if (!validated.success) {
    // M5: Konsistente Error Message, keine Details nach außen
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
  }

  return validated.data.data;
}

/**
 * Hook to create a new loan.
 * Invalidates loan and device queries on success.
 */
export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoan,
    retry: false, // L1: Explizit keine Retries für Mutations
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: borrowerKeys.all });
    },
  });
}

// === STORY 4.3: useReturnDevice Hook ===

/**
 * Payload for returning a device
 */
interface ReturnDevicePayload {
  loanId: string;
  returnNote?: string | null;
}

/**
 * Context for optimistic updates and rollback
 */
interface ReturnDeviceContext {
  previousLoans: ActiveLoan[] | undefined;
}

/**
 * Returns a device via PATCH /api/loans/:loanId
 * AC#3: PATCH endpoint with optional returnNote
 * H1: Input validation before API call
 * C2: Response validation for data integrity
 */
async function returnDevice(payload: ReturnDevicePayload): Promise<void> {
  // H1: Validate input before sending to API
  const inputValidation = ReturnDevicePayloadSchema.safeParse(payload);
  if (!inputValidation.success) {
    throw new Error(ERROR_MESSAGES.INVALID_INPUT);
  }

  const body = payload.returnNote ? { returnNote: payload.returnNote } : {};

  const response = await apiClient.patch<unknown>(
    `/api/loans/${payload.loanId}`,
    body
  );

  // C2: Validate response
  const validated = ReturnDeviceResponseSchema.safeParse(response);
  if (!validated.success) {
    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
  }
}

/**
 * Hook to return a device.
 * AC#5: Optimistic update - removes loan from cache immediately
 * AC#6: Rollback on error - restores loan to cache
 * Invalidates loan and device queries on settled.
 */
export function useReturnDevice() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReturnDevicePayload, ReturnDeviceContext>({
    mutationFn: returnDevice,
    retry: false, // L1: Explizit keine Retries für Mutations
    onMutate: async ({ loanId }) => {
      // AC#5: Optimistic update - cancel ongoing queries and remove loan from cache
      await queryClient.cancelQueries({ queryKey: loanKeys.active() });
      const previousLoans = queryClient.getQueryData<ActiveLoan[]>(loanKeys.active());
      queryClient.setQueryData<ActiveLoan[]>(loanKeys.active(), (old) =>
        old?.filter((l) => l.id !== loanId) ?? []
      );
      return { previousLoans };
    },
    onError: (_err, _vars, context) => {
      // AC#6: Rollback on error - restore loan to cache
      if (context?.previousLoans) {
        queryClient.setQueryData(loanKeys.active(), context.previousLoans);
      }
    },
    onSettled: () => {
      // Invalidate queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: loanKeys.active() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
    },
  });
}
