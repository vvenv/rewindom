export function parseSortDir(
  value: unknown,
): "asc" | "desc" | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

export function resolveSortField(
  sortBy: string | undefined,
  allowed: ReadonlySet<string>,
  fallback: string,
): string {
  return sortBy && allowed.has(sortBy) ? sortBy : fallback;
}

export function resolveSortOrder(
  sortDir: "asc" | "desc" | undefined,
  fallback: "asc" | "desc" = "desc",
): "asc" | "desc" {
  return sortDir ?? fallback;
}
