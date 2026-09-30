const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return sessionStorage.getItem('stockwise_token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {
        Authorization: `Bearer ${token}`
      } : {}),
      ...options.headers
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  });
  const payload = await response.json().catch(() => ({
    success: false,
    error: {
      message: 'The server returned an unreadable response.'
    }
  }));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'The request could not be completed.');
    error.status = response.status;
    if (response.status === 401) window.dispatchEvent(new Event('stockwise:unauthorized'));
    throw error;
  }
  return payload.data;
}
