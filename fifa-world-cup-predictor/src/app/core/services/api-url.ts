type AppConfigWindow = Window & {
  __APP_CONFIG__?: {
    API_BASE_URL?: string;
  };
};

const runtimeApiBaseUrl =
  ((window as AppConfigWindow).__APP_CONFIG__?.API_BASE_URL || '').trim();

const normalizedBaseUrl = runtimeApiBaseUrl.replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedBaseUrl) {
    return normalizedPath;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}
