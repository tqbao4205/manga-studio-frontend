export function logApiCall(domain, action, payload = {}) {
  const enabled =
    import.meta.env.DEV ||
    String(import.meta.env.VITE_ENABLE_API_TELEMETRY || '').toLowerCase() === 'true';

  if (!enabled) return;

  console.debug(`[api:${domain}] ${action}`, {
    ...payload,
    at: new Date().toISOString(),
  });
}
