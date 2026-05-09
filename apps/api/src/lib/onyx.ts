import { type ZodSchema } from "zod";

const BASE_URL = "https://predictions.dev-onyxodds.com";

export async function onyxFetch<T>(path: string, schema: ZodSchema<T>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Onyx API returned ${res.status} for ${path}`);
  }

  const raw: unknown = await res.json();

  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error(`Onyx parse failure for ${path}:`, JSON.stringify(raw));
    throw new Error(`Onyx response validation failed for ${path}: ${result.error.message}`);
  }

  return result.data;
}
