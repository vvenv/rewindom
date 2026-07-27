export function setOrDeleteParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value !== undefined && value !== "") {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}
