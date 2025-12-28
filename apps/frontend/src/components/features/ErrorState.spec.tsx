import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders error icon and message', () => {
    const mockRetry = vi.fn();
    render(<ErrorState error={null} onRetry={mockRetry} />);

    expect(screen.getByText('Fehler beim Laden der Geräte')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('displays user-friendly message for network errors', () => {
    const mockRetry = vi.fn();
    const networkError = new Error('Failed to fetch');
    render(<ErrorState error={networkError} onRetry={mockRetry} />);

    // Should show sanitized network error message, not raw error
    expect(screen.getByText(/Verbindung zum Server/i)).toBeInTheDocument();
  });

  it('displays user-friendly message for server errors (500)', () => {
    const mockRetry = vi.fn();
    const serverError = new Error('HTTP 500 Internal Server Error');
    render(<ErrorState error={serverError} onRetry={mockRetry} />);

    expect(screen.getByText(/Server ist momentan nicht erreichbar/i)).toBeInTheDocument();
  });

  it('displays user-friendly message for timeout errors', () => {
    const mockRetry = vi.fn();
    const timeoutError = new Error('Request timeout');
    render(<ErrorState error={timeoutError} onRetry={mockRetry} />);

    expect(screen.getByText(/Anfrage hat zu lange gedauert/i)).toBeInTheDocument();
  });

  it('shows generic error message when error is null', () => {
    const mockRetry = vi.fn();
    render(<ErrorState error={null} onRetry={mockRetry} />);

    // Sanitized message for null error
    expect(screen.getByText(/unbekannter Fehler/i)).toBeInTheDocument();
  });

  it('shows generic error message for unknown errors', () => {
    const mockRetry = vi.fn();
    const unknownError = new Error('Some unknown error');
    render(<ErrorState error={unknownError} onRetry={mockRetry} />);

    // Sanitized generic message - never expose raw error
    expect(screen.getByText(/Fehler ist aufgetreten/i)).toBeInTheDocument();
  });

  it('calls onRetry when button clicked', () => {
    const mockRetry = vi.fn();
    render(<ErrorState error={null} onRetry={mockRetry} />);

    const retryButton = screen.getByText('Erneut versuchen');
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('retry button has correct touch target', () => {
    const mockRetry = vi.fn();
    render(<ErrorState error={null} onRetry={mockRetry} />);

    const retryButton = screen.getByText('Erneut versuchen').closest('button');
    expect(retryButton).toBeInTheDocument();
  });
});
