export const DEBUG_QUERY_PARAM = "debug";

export function hasDebugQueryParam(params: URLSearchParams): boolean {
  return params.has(DEBUG_QUERY_PARAM);
}

export function appendDebugQueryParam(params: URLSearchParams): void {
  params.set(DEBUG_QUERY_PARAM, "1");
}
