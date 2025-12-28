export function LoadingState() {
  return (
    <div
      className="flex items-center justify-center min-h-[200px]"
      role="status"
      aria-label="Geräte werden geladen"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <span className="sr-only">Geräte werden geladen...</span>
    </div>
  );
}
