export type ApiTokenProvider = () => Promise<string>;

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  getApiToken: ApiTokenProvider,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const token = await getApiToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetcher(input, { ...init, headers });
}
