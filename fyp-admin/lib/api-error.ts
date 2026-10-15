// Backend exception filters can wrap messages more than once.
export function apiErrorMessage(value: unknown, fallback = 'Unable to complete the request.', depth = 0): string {
  if (depth > 8) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (Array.isArray(value)) {
    const messages = value.map(item => apiErrorMessage(item, '', depth + 1)).filter(Boolean);
    return messages.join(' ') || fallback;
  }
  if (value && typeof value === 'object') {
    for (const key of ['message', 'errors', 'error']) {
      if (key in value) {
        const message = apiErrorMessage((value as Record<string, unknown>)[key], '', depth + 1);
        if (message) return message;
      }
    }
  }
  return fallback;
}
