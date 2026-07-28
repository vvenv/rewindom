/**
 * 与 Prisma 生成的 `Prisma.JsonValue` 结构等价的 JSON 值类型。
 *
 * 对象成员写成可选（`?`），这样 Prisma 读出来的 `JsonObject`
 * （`{ [key: string]: JsonValue | undefined }`）可以直接赋值过来，
 * 而 client / shared 不必依赖 `@prisma/client`。
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
