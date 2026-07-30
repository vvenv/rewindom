/**
 * 自定义 ESLint 规则：租户态模型的查询必须带租户谓词。
 *
 * 与运行时的 tenant-guard（packages/server-kernel/src/lib/tenant-guard.ts）是两层：
 *  - tenant-guard 是**强制层**，在 Prisma 上注入谓词，漏写也不会越权；
 *  - 本规则是**提前反馈层**，让漏写在编辑器里就变红，而不是等到运行时被守卫改写。
 *
 * 对 AuditLog / ErrorLog / SlowQueryLog 这三个模型，本规则是**唯一**的防线 ——
 * 它们的 tenant_slug 可为 null 且「null = 未归属」有业务含义，运行时守卫
 * 有意不注入（见 tenant-guard 里的 service_enforced），过滤只能靠调用方自觉。
 */

/**
 * 模型访问器（Prisma 的 camelCase）→ 该模型应出现的租户字段。
 *
 * 数据在 `tenant-models.json`（ESLint 与 tenant-guard 测试共用）；
 * `tenant-guard.test.ts` 直接 import 该 JSON 与运行时守卫比对，漂了会红。
 */
import TENANT_MODELS from "./tenant-models.json" with { type: "json" };

export { TENANT_MODELS };

/** 需要 where 里带租户谓词的操作。 */
const WHERE_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/** 需要 data 里带租户字段的操作。 */
const DATA_OPERATIONS = new Set(["create", "createMany"]);

/** 认可的辅助函数：调用它即视为已做租户隔离。 */
const SCOPE_HELPERS = ["withTenantScope"];

function isPrismaReceiver(node) {
  if (node.type === "Identifier") {
    return node.name === "prisma" || node.name === "tx";
  }
  // app.prisma.xxx / this.prisma.xxx
  if (node.type === "MemberExpression" && node.property.type === "Identifier") {
    return node.property.name === "prisma";
  }
  return false;
}

export const tenantScopePlugin = {
  rules: {
    "require-tenant-scope": {
      meta: {
        type: "problem",
        docs: {
          description:
            "租户态模型的 Prisma 查询必须带租户谓词（tenant_id / tenant_slug），或经 withTenantScope 构造",
        },
        schema: [],
        messages: {
          missingWhere:
            "{{model}}.{{method}}() 未带租户过滤：where 里应包含 {{field}}，或用 withTenantScope() 构造。{{extra}}",
          missingData:
            "{{model}}.{{method}}() 未写入租户归属：data 里应包含 {{field}}。{{extra}}",
        },
      },
      create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        /** 该参数子树里是否出现了租户字段或认可的辅助函数。 */
        function mentionsTenant(node, field) {
          if (!node) return false;
          const text = sourceCode.getText(node);
          if (SCOPE_HELPERS.some((h) => text.includes(`${h}(`))) return true;
          // 显式声明为平台级的行（如平台角色）本就不属于任何租户
          if (/\bscope\s*:\s*["']platform["']/u.test(text)) return true;
          // 字段名出现即认为已考虑租户（本规则是提前反馈，不追求语义级精确）
          return new RegExp(`\\b${field}\\b`, "u").test(text);
        }

        /**
         * where/data 的值是否可静态判断。
         *
         * `where: someVar` 这类要么是上游用 withTenantScope 拼好的（notes 就是），
         * 要么无从判断 —— 一律交给运行时守卫，避免把正确代码报成红的。
         * 只有写成字面量对象时才有把握断言「这里确实漏了租户字段」。
         */
        function isAnalyzable(value) {
          if (value === "unanalyzable") return false;
          if (value === null) return true; // 压根没写 where，是可判定的漏写
          return value.type === "ObjectExpression";
        }

        function findProperty(objectExpression, name) {
          if (!objectExpression || objectExpression.type !== "ObjectExpression") {
            return null;
          }
          for (const prop of objectExpression.properties) {
            // 有展开就无法静态判断，交给运行时守卫
            if (prop.type === "SpreadElement") return "unanalyzable";
            if (
              prop.type === "Property" &&
              prop.key.type === "Identifier" &&
              prop.key.name === name
            ) {
              return prop.value;
            }
          }
          return null;
        }

        return {
          CallExpression(node) {
            const callee = node.callee;
            if (
              callee.type !== "MemberExpression" ||
              callee.property.type !== "Identifier" ||
              callee.object.type !== "MemberExpression" ||
              callee.object.property.type !== "Identifier"
            ) {
              return;
            }

            if (!isPrismaReceiver(callee.object.object)) return;

            const model = callee.object.property.name;
            const method = callee.property.name;
            const field = TENANT_MODELS[model];
            if (!field) return;

            const isWhereOp = WHERE_OPERATIONS.has(method);
            const isDataOp = DATA_OPERATIONS.has(method);
            if (!isWhereOp && !isDataOp) return;

            const arg = node.arguments[0];
            // 整个入参是变量/展开时无法静态分析，交给运行时守卫
            if (arg && arg.type !== "ObjectExpression") return;

            const extra =
              field === "tenant_slug"
                ? "该模型运行时守卫不会自动注入，必须自行过滤。"
                : "";

            if (isWhereOp) {
              const where = findProperty(arg, "where");
              if (!isAnalyzable(where)) return;
              if (!where || !mentionsTenant(where, field)) {
                context.report({
                  node,
                  messageId: "missingWhere",
                  data: { model, method, field, extra },
                });
              }
              return;
            }

            const data = findProperty(arg, "data");
            if (!isAnalyzable(data)) return;
            if (!data || !mentionsTenant(data, field)) {
              context.report({
                node,
                messageId: "missingData",
                data: { model, method, field, extra },
              });
            }
          },
        };
      },
    },
  },
};
