const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

export function buildApiUrl(path: string) {
  const normalizedBaseUrl = RAW_API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}
