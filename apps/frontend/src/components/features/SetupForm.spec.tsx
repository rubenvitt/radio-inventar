// apps/frontend/src/components/features/SetupForm.spec.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupForm } from './SetupForm';
import * as setupApi from '@/api/setup';
import { ApiError } from '@/api/client';

// Mock the setup API
vi.mock('@/api/setup', () => ({
  useCreateFirstAdmin: vi.fn(),
}));

// Mock useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('SetupForm', () => {
  let queryClient: QueryClient;
  const mockMutate = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(setupApi.useCreateFirstAdmin).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isIdle: true,
      isSuccess: false,
      status: 'idle',
      variables: undefined,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      mutateAsync: vi.fn(),
      submittedAt: 0,
    } as any);
  });

  const renderSetupForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SetupForm />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the setup form with all fields', () => {
      renderSetupForm();

      expect(screen.getByText('Ersteinrichtung')).toBeInTheDocument();
      expect(screen.getByLabelText(/benutzername/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^passwort$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passwort bestätigen/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /admin erstellen/i })).toBeInTheDocument();
    });

    it('should show description text', () => {
      renderSetupForm();

      expect(
        screen.getByText(/erstellen sie das erste admin-konto/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when username is too short', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), 'ab');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/mindestens 3 zeichen/i)).toBeInTheDocument();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), 'admin');
      await user.type(screen.getByLabelText(/^passwort$/i), 'short');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'short');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/mindestens 8 zeichen/i)).toBeInTheDocument();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), 'admin');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'different123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwörter stimmen nicht überein/i)).toBeInTheDocument();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call createFirstAdmin on valid submission', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), 'admin');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { username: 'admin', password: 'password123' },
          expect.any(Object)
        );
      });
    });

    it('should trim username before submission', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), '  admin  ');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { username: 'admin', password: 'password123' },
          expect.any(Object)
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when pending', () => {
      vi.mocked(setupApi.useCreateFirstAdmin).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        status: 'pending',
        variables: { username: 'admin', password: 'password123' },
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        mutateAsync: vi.fn(),
        submittedAt: Date.now(),
      } as any);

      renderSetupForm();

      expect(screen.getByText(/erstelle admin/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should disable inputs when pending', () => {
      vi.mocked(setupApi.useCreateFirstAdmin).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        status: 'pending',
        variables: { username: 'admin', password: 'password123' },
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        mutateAsync: vi.fn(),
        submittedAt: Date.now(),
      } as any);

      renderSetupForm();

      expect(screen.getByLabelText(/benutzername/i)).toBeDisabled();
      expect(screen.getByLabelText(/^passwort$/i)).toBeDisabled();
      expect(screen.getByLabelText(/passwort bestätigen/i)).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display API error message', async () => {
      const user = userEvent.setup();
      const mockError = new ApiError(403, 'Forbidden', 'Setup bereits abgeschlossen');

      mockMutate.mockImplementation((_data: any, options: any) => {
        options.onError(mockError);
      });

      renderSetupForm();

      await user.type(screen.getByLabelText(/benutzername/i), 'admin');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Setup bereits abgeschlossen');
      });
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      renderSetupForm();

      // Trigger validation error
      await user.type(screen.getByLabelText(/benutzername/i), 'ab');
      await user.type(screen.getByLabelText(/^passwort$/i), 'password123');
      await user.type(screen.getByLabelText(/passwort bestätigen/i), 'password123');
      await user.click(screen.getByRole('button', { name: /admin erstellen/i }));

      await waitFor(() => {
        expect(screen.getByText(/mindestens 3 zeichen/i)).toBeInTheDocument();
      });

      // Start typing again
      await user.type(screen.getByLabelText(/benutzername/i), 'c');

      // Error should be cleared
      expect(screen.queryByText(/mindestens 3 zeichen/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria attributes on inputs', () => {
      renderSetupForm();

      const usernameInput = screen.getByLabelText(/benutzername/i);
      const passwordInput = screen.getByLabelText(/^passwort$/i);
      const confirmInput = screen.getByLabelText(/passwort bestätigen/i);

      expect(usernameInput).toHaveAttribute('autocomplete', 'username');
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmInput).toHaveAttribute('autocomplete', 'new-password');
    });

    it('should have aria-busy on button when loading', () => {
      vi.mocked(setupApi.useCreateFirstAdmin).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        status: 'pending',
        variables: { username: 'admin', password: 'password123' },
        reset: vi.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        mutateAsync: vi.fn(),
        submittedAt: Date.now(),
      } as any);

      renderSetupForm();

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });
  });
});
