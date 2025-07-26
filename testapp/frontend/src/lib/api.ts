export function getCsrfToken(): string | null {
  const match = document.cookie.match(/(^|;)\s*([^;]*)?csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[3]) : null;
}

export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const csrf = getCsrfToken();
  const headers = new Headers(init.headers);
  if (csrf) {
    headers.set("x-csrf-token", csrf);
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
