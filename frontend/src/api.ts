export type Language = "typescript" | "python";
export const example = import.meta.env.VITE_EXAMPLE as Language | undefined;
export async function api<T>(
  language: Language,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `${example ? "/api" : `/api/${language}`}${path}`,
    {
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : typeof data.detail === "string"
          ? data.detail
          : "The request failed. Check the backend and try again.",
    );
  return data;
}
export const terminal = (status?: string) =>
  ["succeeded", "completed", "failed", "canceled"].includes(status ?? "");
