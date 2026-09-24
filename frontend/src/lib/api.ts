import { API_BASE_URL } from "@/lib/config";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // A proxy or tunnel in front of the app answers 5xx with its own HTML error
  // page, so the body is not always the JSON envelope we expect. Fall back to a
  // status-based message rather than throwing an opaque JSON parse error.
  let data: (T & { success?: boolean; message?: string }) | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (data === null) {
    throw new Error(
      response.status >= 500
        ? "The server is temporarily unavailable. Please try again."
        : `Request failed (${response.status})`
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message ?? "Request failed");
  }

  return data as T;
}
