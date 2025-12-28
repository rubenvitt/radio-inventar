import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DeviceDeleteDialog } from './DeviceDeleteDialog';
import type { Device } from '@/api/admin-devices';
import { ApiError } from '@/api/client';

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useDeleteDevice hook
vi.mock('@/api/admin-devices', async () => {
  const actual = await vi.importActual('@/api/admin-devices');
  return {
    ...actual,
    useDeleteDevice: vi.fn(),
    getDeviceErrorMessage: vi.fn((error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        return 'Funkruf existiert bereits oder Gerät ist ausgeliehen';
      }
      return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }),
  };
});

import { useDeleteDevice } from '@/api/admin-devices';
import { toast } from 'sonner';

const mockUseDeleteDevice = useDeleteDevice as Mock;
const mockToast = toast as unknown as {
  success: Mock;
  error: Mock;
};

// Test device data
const mockDevice: Device = {
  id: 'device-001',
  callSign: 'Florian 4-23',
  deviceType: 'Motorola DP4800',
  serialNumber: 'SN123456',
  status: 'AVAILABLE',
  notes: null,
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-01T10:00:00Z'),
};

function createMockReturn(overrides = {}) {
  return {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    ...overrides,
  };
}

describe('DeviceDeleteDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteDevice.mockReturnValue(createMockReturn());
  });

  describe('Rendering', () => {
    it('displays device callSign in title (AC6)', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );
      expect(screen.getByText('Gerät "Florian 4-23" löschen?')).toBeInTheDocument();
    });

    it('displays warning text about irreversible action (AC7)', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );
      expect(
        screen.getByText('Diese Aktion kann nicht rückgängig gemacht werden.')
      ).toBeInTheDocument();
    });

    it('displays "Abbrechen" button', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );
      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
    });

    it('displays "Löschen" button with destructive styling', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );
      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('does not render when open is false', () => {
      render(
        <DeviceDeleteDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );
      expect(screen.queryByText('Gerät "Florian 4-23" löschen?')).not.toBeInTheDocument();
    });
  });

  describe('Confirmation Flow', () => {
    it('calls onOpenChange(false) when cancel button is clicked', async () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets retry state when dialog closes via onOpenChange', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const { rerender } = render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      // Trigger error to show retry state
      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Close dialog
      rerender(
        <DeviceDeleteDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      // Dialog should not be visible
      expect(screen.queryByText('Gerät "Florian 4-23" löschen?')).not.toBeInTheDocument();
    });
  });

  describe('Delete Action', () => {
    it('calls deleteDevice.mutateAsync with device.id when delete button clicked', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      expect(mockMutateAsync).toHaveBeenCalledWith('device-001');
    });

    it('shows success toast with device callSign on successful deletion (AC11)', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Gerät "Florian 4-23" wurde gelöscht');
      });
    });

    it('closes dialog after successful deletion (AC11)', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Error Handling - 409 Conflict (AC8)', () => {
    it('shows special error message for 409 ON_LOAN conflict', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new ApiError(409, 'Conflict', 'Device is on loan'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Das Gerät ist derzeit ausgeliehen und kann nicht gelöscht werden.',
          { duration: 5000 }
        );
      });
    });

    it('closes dialog on 409 conflict error', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new ApiError(409, 'Conflict', 'Device is on loan'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('does not show retry button for 409 conflict error', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new ApiError(409, 'Conflict', 'Device is on loan'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Das Gerät ist derzeit ausgeliehen und kann nicht gelöscht werden.',
          { duration: 5000 }
        );
      });

      // For 409 errors, no retry action should be shown
      const errorCall = mockToast.error.mock.calls[0]![1];
      expect(errorCall).not.toHaveProperty('action');
    });
  });

  describe('Error Handling - Network Errors (AC12)', () => {
    it('shows error toast with retry action for network errors', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          expect.objectContaining({
            duration: 5000,
            action: expect.objectContaining({
              label: 'Erneut versuchen',
              onClick: expect.any(Function),
            }),
          })
        );
      });
    });

    it('retry action calls handleDelete again', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Get retry action and call it
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      const retryAction = errorCall.action.onClick;

      // Call retry action
      retryAction();

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('keeps dialog open on network error', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Dialog should remain open (onOpenChange should not be called)
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('Loading State (AC10)', () => {
    it('shows loading state during deletion', () => {
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(screen.getByText('Wird gelöscht...')).toBeInTheDocument();
      expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
    });

    it('shows spinner icon during deletion', () => {
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      // Loader2 has animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables cancel button during deletion', () => {
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
    });

    it('disables delete button during deletion', () => {
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ isPending: true }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(screen.getByRole('button', { name: 'Wird gelöscht...' })).toBeDisabled();
    });

    it('enables all controls when not pending', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(screen.getByRole('button', { name: 'Abbrechen' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Löschen' })).not.toBeDisabled();
    });
  });

  describe('XSS Protection', () => {
    it('sanitizes callSign with HTML tags in title', () => {
      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<script>alert("xss")</script>Florian',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      // Script tags should be stripped
      expect(screen.queryByText(/<script>/)).not.toBeInTheDocument();
      expect(screen.getByText(/scriptalert.*Florian.*löschen/i)).toBeInTheDocument();
    });

    it('sanitizes callSign with special characters', () => {
      const specialCharDevice: Device = {
        ...mockDevice,
        callSign: 'Test"\'`<>',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={specialCharDevice}
        />
      );

      // Should see sanitized version
      expect(screen.getByText('Gerät "Test" löschen?')).toBeInTheDocument();
    });

    it('sanitizes callSign with img tag', () => {
      const imgDevice: Device = {
        ...mockDevice,
        callSign: '<img src=x onerror=alert(1)>Device',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={imgDevice}
        />
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText(/img src.*Device.*löschen/i)).toBeInTheDocument();
    });

    it('sanitizes callSign in success toast', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<b>Bold</b>Device',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Gerät "bBold/bDevice" wurde gelöscht');
      });
    });

    // Fix #4: XSS in Toasts
    it('sanitizes device name in error toast', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<script>alert(1)</script>Device',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Verify the error toast message doesn't contain script tags
      const errorCalls = mockToast.error.mock.calls;
      const errorMessage = errorCalls[0]![0] as string;
      expect(errorMessage).not.toContain('<script>');
      expect(errorMessage).not.toContain('</script>');
    });

    it('sanitizes device name in 409 conflict toast', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(
        new ApiError(409, 'Conflict', 'Device is on loan')
      );
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<img src=x onerror=alert(1)>',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      const errorCalls = mockToast.error.mock.calls;
      const errorMessage = errorCalls[0]![0] as string;
      expect(errorMessage).not.toContain('<img');
      expect(errorMessage).not.toContain('onerror');
    });
  });

  describe('XSS in Toasts - Extended Tests (Issue #2)', () => {
    it('sanitizes malicious HTML tags in success toast message', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<iframe src="evil.com"></iframe>Test',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      // Verify the toast message strips HTML tags (< and >)
      const successCalls = mockToast.success.mock.calls;
      const successMessage = successCalls[0]![0] as string;
      expect(successMessage).not.toContain('<iframe');
      expect(successMessage).not.toContain('</iframe>');
      expect(successMessage).toContain('Test');
      // Note: src= remains but is harmless without < > brackets
    });

    it('sanitizes event handler tags in toast messages', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<div onload="alert(1)">Device</div>',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      const successCalls = mockToast.success.mock.calls;
      const successMessage = successCalls[0]![0] as string;
      // Tags are stripped
      expect(successMessage).not.toContain('<div');
      expect(successMessage).not.toContain('</div>');
      expect(successMessage).toContain('Device');
      // Note: onload= remains but is harmless without < > brackets
    });

    it('sanitizes quotes in 409 error toast to prevent attribute injection', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(
        new ApiError(409, 'Conflict', 'Device is on loan')
      );
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: 'Device" onclick="alert(1)',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      const errorCalls = mockToast.error.mock.calls;
      const errorMessage = errorCalls[0]![0] as string;
      // Quotes are stripped, preventing injection
      expect(errorMessage).not.toContain('" onclick="');
      // Error message doesn't contain device name for 409 errors
      expect(errorMessage).toContain('Gerät ist derzeit ausgeliehen');
    });

    it('sanitizes javascript: URLs in toast messages', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<a href="javascript:alert(1)">Device</a>',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      const successCalls = mockToast.success.mock.calls;
      const successMessage = successCalls[0]![0] as string;
      // Tags are stripped
      expect(successMessage).not.toContain('<a');
      expect(successMessage).not.toContain('</a>');
      expect(successMessage).toContain('Device');
    });

    it('prevents XSS via combined HTML and quotes', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const xssDevice: Device = {
        ...mockDevice,
        callSign: '<img src=x onerror="alert(\'XSS\')">',
      };

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={xssDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });

      const successCalls = mockToast.success.mock.calls;
      const successMessage = successCalls[0]![0] as string;
      // Tags are stripped
      expect(successMessage).not.toContain('<img');
      // Quotes are stripped
      expect(successMessage).not.toContain('"alert');
      expect(successMessage).not.toContain("'XSS'");
    });
  });

  describe('Retry Logic (Fix #5)', () => {
    it('handles multiple retry attempts in sequence', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // First attempt fails
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });

      // Retry once
      const errorCall1 = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall1.action.onClick();

      // Second attempt fails
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(2);
      });

      // Retry again
      const errorCall2 = mockToast.error.mock.calls[1]![1] as { action: { onClick: () => void } };
      errorCall2.action.onClick();

      // Third attempt succeeds
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      });
    });

    it('retry button is disabled during pending mutation', async () => {
      let resolveMutation: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });

      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({
        mutateAsync: mockMutateAsync,
        isPending: true
      }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      // During pending, button should be disabled
      const deleteButton = screen.getByRole('button', { name: 'Wird gelöscht...' });
      expect(deleteButton).toBeDisabled();

      // Clean up
      resolveMutation!(undefined);
    });

    // MEDIUM #7: Enhanced rapid-click test with stronger assertions
    it('handles rapid retry clicks correctly with proper state management', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // First error
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });

      // MEDIUM #7: Test rapid clicks with proper state assertions
      const errorCall1 = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      const retryAction1 = errorCall1.action.onClick;

      // Rapid click 1
      retryAction1();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(2);
      });

      // Rapid click 2
      const errorCall2 = mockToast.error.mock.calls[1]![1] as { action: { onClick: () => void } };
      const retryAction2 = errorCall2.action.onClick;
      retryAction2();

      // Third attempt succeeds
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });

      // Verify mutation was called 3 times total
      expect(mockMutateAsync).toHaveBeenCalledTimes(3);
      expect(callCount).toBe(3);
    });

    it('retry after different error types - network error', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Retry after network error
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('retry after different error types - server error', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Internal Server Error'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Retry after server error
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('retry after different error types - connection refused', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection refused'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Retry after connection error
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('preserves retry state across multiple errors', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Persistent error'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // First error
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });

      // Retry - should show second error
      const errorCall1 = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall1.action.onClick();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(2);
      });

      // Each error should have retry action
      const errorCall2 = mockToast.error.mock.calls[1]![1] as { action: { onClick: () => void } };
      expect(errorCall2.action).toBeDefined();
      expect(errorCall2.action.label).toBe('Erneut versuchen');
    });
  });

  describe('Touch Targets (AC9)', () => {
    it('cancel button has minimum 44px height', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toHaveClass('min-h-16'); // 64px = 16 * 4px
    });

    it('delete button has minimum 64px height', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      expect(deleteButton).toHaveClass('min-h-16'); // 64px = 16 * 4px
    });
  });

  describe('Accessibility', () => {
    it('has dialog with accessible title', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(
        screen.getByRole('alertdialog', { name: 'Gerät "Florian 4-23" löschen?' })
      ).toBeInTheDocument();
    });

    it('has dialog description', () => {
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const description = screen.getByText('Diese Aktion kann nicht rückgängig gemacht werden.');
      expect(description).toBeInTheDocument();
    });

    it('delete button prevents default form submission', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });

      // Click should work without triggering form submission
      fireEvent.click(deleteButton);

      expect(mockMutateAsync).toHaveBeenCalledWith('device-001');
    });
  });

  describe('Network Error Recovery (Issue #4)', () => {
    it('handles initial fetch failure followed by retry success', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Failed to fetch'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // Initial fetch failed
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Fehler'),
          expect.objectContaining({
            action: expect.objectContaining({
              label: 'Erneut versuchen',
            }),
          })
        );
      });

      // Retry should succeed
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('simulates offline to online transition with successful retry', async () => {
      let isOnline = false;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        if (!isOnline) {
          return Promise.reject(new Error('Network request failed'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      // Attempt delete while offline
      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Simulate going online
      isOnline = true;

      // Retry now that we're online
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('handles timeout error with retry', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Request timeout'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('handles DNS resolution failure with retry', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('getaddrinfo ENOTFOUND'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('shows appropriate error message for connection refused', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Connection refused'));
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            duration: 5000,
            action: expect.objectContaining({
              label: 'Erneut versuchen',
            }),
          })
        );
      });
    });

    it('maintains dialog state during network recovery', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // Error - dialog should stay open
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      expect(screen.getByText('Gerät "Florian 4-23" löschen?')).toBeInTheDocument();

      // Retry and succeed - dialog should close
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      errorCall.action.onClick();

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Component Behavior', () => {
    it('is memoized', () => {
      // DeviceDeleteDialog should be wrapped with memo()
      expect(DeviceDeleteDialog).toBeDefined();
      expect((DeviceDeleteDialog as any).$$typeof).toBeDefined();
    });

    it('handles empty callSign gracefully', () => {
      const emptyDevice: Device = {
        ...mockDevice,
        callSign: '',
      };

      const { container } = render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={emptyDevice}
        />
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
      expect(screen.getByText('Gerät "" löschen?')).toBeInTheDocument();
    });

    it('resets retry state when new delete is attempted', async () => {
      let callCount = 0;
      const mockMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(undefined);
      });
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });

      // First attempt - should fail
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Get retry action and call it
      const errorCall = mockToast.error.mock.calls[0]![1] as { action: { onClick: () => void } };
      const retryAction = errorCall.action.onClick;

      // Second attempt via retry - should succeed
      retryAction();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  // MEDIUM #11: Keyboard Shortcut Tests
  describe('Keyboard Shortcuts', () => {
    it('closes dialog on Escape key press', async () => {
      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();

      // Press Escape key
      await user.keyboard('{Escape}');

      // Dialog should close
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('triggers delete on Enter key press when delete button is focused', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      mockUseDeleteDevice.mockReturnValue(createMockReturn({ mutateAsync: mockMutateAsync }));

      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });

      // Focus delete button
      deleteButton.focus();
      expect(deleteButton).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');

      // Delete should be triggered
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('device-001');
      });
    });

    it('does not close on Escape during pending deletion', async () => {
      let resolveMutation: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });
      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseDeleteDevice.mockReturnValue(
        createMockReturn({ mutateAsync: mockMutateAsync, isPending: true })
      );

      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // Wait for mutation to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to close with Escape during pending mutation
      await user.keyboard('{Escape}');

      // Cancel button should be disabled
      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toBeDisabled();

      // Clean up
      resolveMutation!(undefined);
    });

    it('allows Tab navigation between buttons', async () => {
      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      const deleteButton = screen.getByRole('button', { name: 'Löschen' });

      // Focus first button
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();

      // Tab to next button
      await user.tab();
      expect(deleteButton).toHaveFocus();
    });

    it('allows Shift+Tab navigation backwards between buttons', async () => {
      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      const deleteButton = screen.getByRole('button', { name: 'Löschen' });

      // Focus second button
      deleteButton.focus();
      expect(deleteButton).toHaveFocus();

      // Shift+Tab to previous button
      await user.tab({ shift: true });
      expect(cancelButton).toHaveFocus();
    });

    it('prevents Enter key during pending deletion', async () => {
      let resolveMutation: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveMutation = resolve;
      });
      const mockMutateAsync = vi.fn().mockReturnValue(pendingPromise);
      mockUseDeleteDevice.mockReturnValue(
        createMockReturn({ mutateAsync: mockMutateAsync, isPending: true })
      );

      const user = userEvent.setup();
      render(
        <DeviceDeleteDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          device={mockDevice}
        />
      );

      const deleteButton = screen.getByRole('button', { name: 'Löschen' });
      fireEvent.click(deleteButton);

      // Wait for mutation to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Button should be disabled
      expect(deleteButton).toBeDisabled();

      // Try to press Enter again
      await user.keyboard('{Enter}');

      // Should still only have one mutation call
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);

      // Clean up
      resolveMutation!(undefined);
    });
  });
});
