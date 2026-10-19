// EduPulse API client connecting Next.js to Express SQLite backend

const API_BASE = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || '') 
  : 'http://127.0.0.1:5000';

export async function fetchApi(endpoint, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('ep_token');
  }

  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  if (options.csv) {
    headers['Content-Type'] = 'text/csv';
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}/api${cleanEndpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && token) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ep_token');
        localStorage.removeItem('ep_user');
        window.dispatchEvent(new Event('edupulse_logout'));
      }
      throw new Error('Session expired. Please log in again.');
    }

    // Special case for CSV download / text
    if (options.asBlob) {
      if (!res.ok) throw new Error('Failed to download file');
      return await res.blob();
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Server request failed');
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}
