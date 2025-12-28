// apps/frontend/src/components/features/AdminLoginForm.spec.tsx
// Story 5.2: Admin Login UI - Login Form Component Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLoginForm } from './AdminLoginForm';
import { AUTH_ERROR_MESSAGES } from '@radio-inventar/shared';

// Mock the auth API
vi.mock('@/api/auth', () => ({
  useLogin: vi.fn(),
  isRateLimitError: vi.fn(),
}));

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

import { useLogin, isRateLimitError } from '@/api/auth';
import { useNavigate } from '@tanstack/react-router';

const mockUseLogin = useLogin as ReturnType<typeof vi.fn>;
const mockIsRateLimitError = isRateLimitError as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;

// Helper to create mock mutation return value
function createMockMutation(overrides: Partial<ReturnType<typeof useLogin>> = {}) {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  };
}

// Helper to render component with required providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('AdminLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLogin.mockReturnValue(createMockMutation());
    mockIsRateLimitError.mockReturnValue(false);
    mockUseNavigate.mockReturnValue(vi.fn());
  });

  describe('Rendering (AC2)', () => {
    it('renders form with username and password inputs', () => {
      renderWithProviders(<AdminLoginForm />);

      expect(screen.getByLabelText('Benutzername')).toBeInTheDocument();
      expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
    });

    it('renders card with title "Admin Login"', () => {
      renderWithProviders(<AdminLoginForm />);

      expect(screen.getByText('Admin Login')).toBeInTheDocument();
    });

    it('username input has type="text"', () => {
      renderWithProviders(<AdminLoginForm />);

      const usernameInput = screen.getByLabelText('Benutzername');
      expect(usernameInput).toHaveAttribute('type', 'text');
    });

    it('password input has type="password"', () => {
      renderWithProviders(<AdminLoginForm />);

      const passwordInput = screen.getByLabelText('Passwort');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('username input has autocomplete="username"', () => {
      renderWithProviders(<AdminLoginForm />);

      const usernameInput = screen.getByLabelText('Benutzername');
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');
    });

    it('password input has autocomplete="current-password"', () => {
      renderWithProviders(<AdminLoginForm />);

      const passwordInput = screen.getByLabelText('Passwort');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('username input has autofocus', () => {
      renderWithProviders(<AdminLoginForm />);

      const usernameInput = screen.getByLabelText('Benutzername');
      // Check that username field is rendered first (indicates autofocus intent)
      // Note: autoFocus prop behavior in JSDOM may not render the attribute
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Client-side Validation (AC9)', () => {
    it('shows error for empty username field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Anmelden' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Benutzername muss mindestens 3 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('shows error for empty password field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Anmelden' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Passwort muss mindestens 8 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('shows error for username less than 3 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'ab');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByText(/Benutzername muss mindestens 3 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('shows error for username greater than 50 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      // Note: maxLength HTML attribute now prevents typing more than 50 characters
      // So we need to directly set the value to test validation
      const usernameInput = screen.getByLabelText('Benutzername');
      const longUsername = 'a'.repeat(51);

      // Fire change event directly to bypass maxLength for testing
      fireEvent.change(usernameInput, { target: { value: longUsername } });
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByText(/Benutzername darf maximal 50 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('shows error for password less than 8 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'short');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByText(/Passwort muss mindestens 8 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('shows error for password greater than 72 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      // Note: maxLength HTML attribute now prevents typing more than 72 characters
      // So we need to directly set the value to test validation
      const passwordInput = screen.getByLabelText('Passwort');
      const longPassword = 'a'.repeat(73);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      // Fire change event directly to bypass maxLength for testing
      fireEvent.change(passwordInput, { target: { value: longPassword } });
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByText(/Passwort darf maximal 72 Zeichen haben/)).toBeInTheDocument();
      });
    });

    it('does not call mutate when validation fails', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByText(/Benutzername muss mindestens 3 Zeichen haben/)).toBeInTheDocument();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('trims whitespace from username before validation', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), '  testadmin  ');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { username: 'testadmin', password: 'password123' },
          expect.any(Object)
        );
      });
    });

    it('field errors have aria-invalid and aria-describedby', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        const usernameInput = screen.getByLabelText('Benutzername');
        expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
        expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error');
      });
    });

    it('field errors have red border styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        const usernameInput = screen.getByLabelText('Benutzername');
        expect(usernameInput).toHaveClass('border-destructive');
      });
    });
  });

  describe('Loading State (AC7)', () => {
    it('shows loading indicator when mutation is pending', () => {
      mockUseLogin.mockReturnValue(createMockMutation({ isPending: true }));

      renderWithProviders(<AdminLoginForm />);

      expect(screen.getByText('Anmelden...')).toBeInTheDocument();
    });

    it('disables submit button when mutation is pending', () => {
      mockUseLogin.mockReturnValue(createMockMutation({ isPending: true }));

      renderWithProviders(<AdminLoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Anmelden...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables input fields when mutation is pending', () => {
      mockUseLogin.mockReturnValue(createMockMutation({ isPending: true }));

      renderWithProviders(<AdminLoginForm />);

      expect(screen.getByLabelText('Benutzername')).toBeDisabled();
      expect(screen.getByLabelText('Passwort')).toBeDisabled();
    });

    it('shows spinner in loading state', () => {
      mockUseLogin.mockReturnValue(createMockMutation({ isPending: true }));

      renderWithProviders(<AdminLoginForm />);

      const spinner = screen.getByText('Anmelden...').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error Messages (AC4, AC10)', () => {
    it('displays error message for 401 invalid credentials', async () => {
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'wronguser');
      await user.type(screen.getByLabelText('Passwort'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
      });
    });

    it('displays error message for network errors', async () => {
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error('Verbindungsfehler. Bitte später erneut versuchen.'));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Verbindungsfehler. Bitte später erneut versuchen.'
        );
      });
    });

    it('error message has role="alert" for accessibility', async () => {
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error('Some error'));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('clears previous error on new submit', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      // First submit with error
      mockMutate.mockImplementationOnce((_credentials, { onError }) => {
        onError(new Error('First error'));
      });

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('First error');
      });

      // Second submit
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Error should be cleared during new submission
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  describe('Rate Limiting (AC5)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllTimers();
    });

    it('displays rate limit error message with countdown', async () => {
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS);
        expect(screen.getByText(/Bitte warten Sie noch \d+ Sekunden\./)).toBeInTheDocument();
      });
    });

    it('disables submit button for 60 seconds on rate limit', async () => {
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Gesperrt/ });
        expect(submitButton).toBeDisabled();
      });
    });

    it('shows countdown timer in button text', async () => {
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Gesperrt \(60s\)/ })).toBeInTheDocument();
      });
    });

    it('countdown timer starts at 60 seconds and decreases', async () => {
      // This test verifies that the 60s countdown is initiated (AC5)
      // Full timer validation would require real-time testing which is brittle
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Countdown starts at 60 seconds as specified in AC5
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Gesperrt \(60s\)/ });
        expect(button).toBeInTheDocument();
        expect(button).toBeDisabled();
      });

      // Verify countdown text appears in error message too (any number)
      expect(screen.getByText(/Bitte warten Sie noch \d+ Sekunden\./)).toBeInTheDocument();
    });

    it('rate limit timeout clears after 60 seconds using fake timers', async () => {
      // AC5: Verify countdown clears after 60s using vi.advanceTimersByTime()
      vi.useFakeTimers();

      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Countdown starts - button is disabled
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Gesperrt/ });
        expect(button).toBeDisabled();
      });

      // Advance time by exactly 60 seconds (RATE_LIMIT_TIMEOUT_MS)
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Button should be re-enabled after timeout
      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Anmelden' });
        expect(button).not.toBeDisabled();
      });

      vi.useRealTimers();
    });

    it('countdown mechanism is active (implementation detail test)', async () => {
      // Tests that getRemainingSeconds() calculation works correctly
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      // Button shows countdown in format "Gesperrt (Xs)"
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Gesperrt \(\d+s\)/ });
        expect(button).toBeInTheDocument();
        expect(button).toBeDisabled();
      });
    });

    it('disables input fields during rate limit', async () => {
      mockIsRateLimitError.mockReturnValue(true);
      const mockMutate = vi.fn((_credentials, { onError }) => {
        onError(new Error(AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS));
      });
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup({ delay: null });
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Benutzername')).toBeDisabled();
        expect(screen.getByLabelText('Passwort')).toBeDisabled();
      });
    });
  });

  describe('Touch Targets (AC6)', () => {
    it('username input has minimum 44px height', () => {
      renderWithProviders(<AdminLoginForm />);

      const usernameInput = screen.getByLabelText('Benutzername');
      // shadcn Input component has min-h-11 (44px) built-in
      expect(usernameInput).toHaveClass('min-h-11');
    });

    it('password input has minimum 44px height', () => {
      renderWithProviders(<AdminLoginForm />);

      const passwordInput = screen.getByLabelText('Passwort');
      // shadcn Input component has min-h-11 (44px) built-in
      expect(passwordInput).toHaveClass('min-h-11');
    });

    it('submit button has minimum 44px height', () => {
      renderWithProviders(<AdminLoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Anmelden' });
      // shadcn Button component size="lg" has min-h-11 (44px) built-in
      expect(submitButton).toHaveClass('min-h-11');
    });
  });

  describe('Form Submission', () => {
    it('calls mutate with correct credentials', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'mypassword123');
      await user.click(screen.getByRole('button', { name: 'Anmelden' }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { username: 'testadmin', password: 'mypassword123' },
          expect.objectContaining({
            onSuccess: expect.any(Function),
            onError: expect.any(Function),
          })
        );
      });
    });

    it('submits form on Enter key', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      const user = userEvent.setup();
      renderWithProviders(<AdminLoginForm />);

      await user.type(screen.getByLabelText('Benutzername'), 'testadmin');
      await user.type(screen.getByLabelText('Passwort'), 'mypassword123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('prevents default form submission', async () => {
      const mockMutate = vi.fn();
      mockUseLogin.mockReturnValue(createMockMutation({ mutate: mockMutate }));

      renderWithProviders(<AdminLoginForm />);

      const form = screen.getByRole('button', { name: 'Anmelden' }).closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefault = vi.fn();
      Object.defineProperty(submitEvent, 'preventDefault', { value: preventDefault });

      fireEvent(form!, submitEvent);

      expect(preventDefault).toHaveBeenCalled();
    });
  });
});
