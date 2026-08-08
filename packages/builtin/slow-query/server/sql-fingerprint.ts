/**
 * SQL fingerprint utility — 归一化 SQL 语句用于聚合统计
 */

/**
 * 生成 SQL fingerprint：去掉字面量占位符、多余空白，保留表名
 */
export function fingerprintSql(sql: string): string {
  let normalized = sql
    // 去掉 NOT IN ($1, $2, ...) 的占位符列表
    .replace(/\$(\d+)(?:\s*,\s*\$(\d+))*/g, "?")
    // 去掉 IN (...) 字面量
    .replace(/IN\s*\([^)]*\)/gi, "IN (?)")
    // 去掉 NOT IN (...)
    .replace(/NOT\s+IN\s*\([^)]*\)/gi, "NOT IN (?)")
    // 去掉 = $1
    .replace(/=\s*\$(\d+)/g, "= ?")
    // 去掉 < $1, > $1, <= $1, >= $1, <> $1
    .replace(/[<>!]=\s*\$(\d+)/g, "= ?")
    .replace(/[<>]\s*\$(\d+)/g, "= ?")
    // 去掉 BETWEEN $1 AND $2
    .replace(/BETWEEN\s+\$\d+\s+AND\s+\$\d+/gi, "BETWEEN ? AND ?")
    // 去掉 LIMIT $1
    .replace(/LIMIT\s+\$\d+/gi, "LIMIT ?")
    // 去掉 OFFSET $1
    .replace(/OFFSET\s+\$\d+/gi, "OFFSET ?")
    // 去掉字符串字面量（单引号）
    .replace(/'[^']*'/g, "'?'")
    // 去掉数字字面量
    .replace(/\b\d+\b/g, "?")
    // 折叠空白
    .replace(/\s+/g, " ")
    .trim();

  // 统一大小写
  normalized = normalized.toUpperCase();

  return normalized;
}
