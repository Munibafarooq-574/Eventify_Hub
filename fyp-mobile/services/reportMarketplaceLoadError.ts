// Recoverable dashboard loads must not open React Native's error overlay.
// Keep diagnostics free of server HTML, tokens and personal response data.
export function reportMarketplaceLoadError(context: string, error: unknown): void {
  if (__DEV__) {
    const status = error && typeof error === 'object' && 'status' in error
      ? error.status : 'unavailable';
    console.log('[Marketplace load]', context, { status });
  }
}
