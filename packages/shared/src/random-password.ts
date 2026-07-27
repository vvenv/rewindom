const PASSWORD_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const DEFAULT_RANDOM_PASSWORD_LENGTH = 12;

export function generateRandomPassword(
  length: number = DEFAULT_RANDOM_PASSWORD_LENGTH,
): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => PASSWORD_CHARS[byte % PASSWORD_CHARS.length],
  ).join("");
}
