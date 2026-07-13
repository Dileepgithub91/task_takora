const API_URL = (
  import.meta.env.VITE_API_URL || 'https://takora-backend.onrender.com/api'
).replace(/\/$/, '');

console.log('CURRENT API URL:', API_URL);

const TOKEN_KEYS = [
  'takoraToken',
  'token',
  'accessToken',
  'authToken',
  'tmToken',
  'takora_token'
];

export function getToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value !== 'undefined' && value !== 'null') return value;
  }
  return '';
}

export function setToken(token) {
  if (token) {
    for (const key of TOKEN_KEYS) localStorage.setItem(key, token);
  } else {
    clearToken();
  }
}

export function clearToken() {
  for (const key of TOKEN_KEYS) localStorage.removeItem(key);
  localStorage.removeItem('takoraUser');
}

export function hasToken() {
  return Boolean(getToken());
}

function buildHeaders(options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 45000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: buildHeaders(options)
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw new Error(error.message || 'Network error. Please check backend deployment.');
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => ({})) : null;

  if (response.status === 401) {
    clearToken();
    throw new Error(data?.message || 'Session expired. Please login again.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong');
  }

  return isJson ? data : response;
}

export async function downloadFile(path, fileName) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: buildHeaders()
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export const download = downloadFile;
