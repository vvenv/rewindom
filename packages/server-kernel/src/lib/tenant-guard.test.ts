import { describe, it, expect, vi } from "vitest";

import TENANT_MODELS from "../../../../eslint-rules/tenant-models.json" with {
  type: "json",
};

import {
  runWithRequestContext,
  type RequestContext,
} from "./request-context.js";
import {
  assertModelClassificationComplete,
  createTenantGuardExtension,
  tenantScopedModelFields,
  CrossTenantAccessError,
  type TenantGuardMode,
  type TenantGuardViolation,
} from "./tenant-guard.js";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function tenantContext(tenantId: string | null): RequestContext {
  return {
    route: "/api/test",
    method: "GET",
    tenant_id: tenantId,
    tenant_slug: tenantId,
    user_id: "user-1",
    username: "tester",
    request_id: "req-1",
    source: "http",
  };
}

/**
 * 直接调用扩展里的 $allOperations 钩子。
 *
 * Prisma 的 defineExtension 返回的是一个待应用的描述对象，单测里不方便真的
 * 挂到 client 上（需要真实数据库），因此取出钩子直接驱动 —— 断言的是
 * 「传给底层 query 的 args 被改写成什么」，这正是守卫的全部职责。
 */
function callGuard(options: {
  mode: TenantGuardMode;
  model: string;
  operation: string;
  args: Record<string, unknown>;
  tenantId: string | null;
}) {
  const violations: TenantGuardViolation[] = [];
  const extension = createTenantGuardExtension({
    mode: options.mode,
    onViolation: (v) => violations.push(v),
  }) as unknown as {
    query: {
      $allModels: {
        $allOperations: (ctx: {
          model: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) => Promise<unknown>;
      };
    };
  };

  const query = vi.fn().mockResolvedValue("result");
  const run = () =>
    extension.query.$allModels.$allOperations({
      model: options.model,
      operation: options.operation,
      args: options.args,
      query,
    });

  const promise =
    options.tenantId === null
      ? runWithRequestContext(tenantContext(null), run)
      : runWithRequestContext(tenantContext(options.tenantId), run);

  return { promise, query, violations };
}

describe("tenant-guard", () => {
  describe("模型登记完整性", () => {
    it("schema 中每个模型都已登记租户归属", () => {
      // 新增模型忘记登记时，这条会失败 —— 这正是它存在的意义。
      expect(() => assertModelClassificationComplete()).not.toThrow();
    });

    it("ESLint 规则的模型表与运行时守卫保持一致", () => {
      // 两处表达同一份知识（JSON 供 ESLint 与测试共用，守卫在 TS 里推导），
      // 只能靠这条比对防漂移：改了一边忘了另一边，这里会红。
      const toAccessor = (model: string) =>
        model.charAt(0).toLowerCase() + model.slice(1);

      const fromGuard = Object.fromEntries(
        Object.entries(tenantScopedModelFields()).map(([model, field]) => [
          toAccessor(model),
          field,
        ]),
      );

      expect(TENANT_MODELS).toEqual(fromGuard);
    });
  });

  describe("无租户上下文时放行", () => {
    it("平台管理员（tenant_id 为 null）不被注入条件", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "findMany",
        args: { where: { title: "x" } },
        tenantId: null,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { title: "x" } });
    });
  });

  describe("enforce 模式", () => {
    it("为缺失 tenant_id 的查询注入当前租户", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "findMany",
        args: { where: { title: "x" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({
        where: { title: "x", tenant_id: TENANT_A },
      });
    });

    it("where 完全缺省时也会注入", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "findMany",
        args: {},
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { tenant_id: TENANT_A } });
    });

    it("显式指向其它租户时抛错，而不是静默改写", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "findMany",
        args: { where: { tenant_id: TENANT_B } },
        tenantId: TENANT_A,
      });

      await expect(promise).rejects.toBeInstanceOf(CrossTenantAccessError);
      expect(query).not.toHaveBeenCalled();
    });

    it("已带正确 tenant_id 的查询原样通过", async () => {
      const { promise, query, violations } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "findMany",
        args: { where: { tenant_id: TENANT_A } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { tenant_id: TENANT_A } });
      expect(violations).toHaveLength(0);
    });

    it("复合唯一键里嵌套的 tenant_id 视为已隔离（不误报 missing）", async () => {
      const where = {
        tenant_id_key: { tenant_id: TENANT_A, key: "ui_config" },
      };
      const { promise, query, violations } = callGuard({
        mode: "enforce",
        model: "TenantSetting",
        operation: "findUnique",
        args: { where },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where });
      expect(violations).toHaveLength(0);
    });

    it("复合唯一键里嵌套了其它租户时仍判定跨租户", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "TenantSetting",
        operation: "findUnique",
        args: {
          where: {
            tenant_id_key: { tenant_id: TENANT_B, key: "ui_config" },
          },
        },
        tenantId: TENANT_A,
      });

      await expect(promise).rejects.toBeInstanceOf(CrossTenantAccessError);
      expect(query).not.toHaveBeenCalled();
    });

    it("delete 同样被注入（避免按 id 删掉别人的行）", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "delete",
        args: { where: { id: "note-1" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({
        where: { id: "note-1", tenant_id: TENANT_A },
      });
    });

    it("create 自动补上 tenant_id", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "create",
        args: { data: { title: "n" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({
        data: { title: "n", tenant_id: TENANT_A },
      });
    });

    it("create 写入别的租户时抛错", async () => {
      const { promise } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "create",
        args: { data: { title: "n", tenant_id: TENANT_B } },
        tenantId: TENANT_A,
      });

      await expect(promise).rejects.toBeInstanceOf(CrossTenantAccessError);
    });

    it("createMany 逐条补 tenant_id", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Note",
        operation: "createMany",
        args: { data: [{ title: "a" }, { title: "b" }] },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({
        data: [
          { title: "a", tenant_id: TENANT_A },
          { title: "b", tenant_id: TENANT_A },
        ],
      });
    });

    it("租户表按主键 id 注入，而不是 tenant_id", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "Tenant",
        operation: "findFirst",
        args: { where: {} },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { id: TENANT_A } });
    });

    it("global 模型不受影响", async () => {
      const { promise, query, violations } = callGuard({
        mode: "enforce",
        model: "BackgroundJob",
        operation: "findMany",
        args: { where: { user_id: "user-1" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { user_id: "user-1" } });
      expect(violations).toHaveLength(0);
    });

    it("service_enforced 模型不被改写（AuditLog 的 null 语义会被注入破坏）", async () => {
      const { promise, query } = callGuard({
        mode: "enforce",
        model: "AuditLog",
        operation: "findMany",
        args: { where: { action: "LOGIN" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { action: "LOGIN" } });
    });
  });

  describe("audit 模式", () => {
    it("只上报不改写", async () => {
      const { promise, query, violations } = callGuard({
        mode: "audit",
        model: "Note",
        operation: "findMany",
        args: { where: { title: "x" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({ where: { title: "x" } });
      expect(violations).toEqual([
        expect.objectContaining({
          model: "Note",
          operation: "findMany",
          kind: "missing",
        }),
      ]);
    });

    it("跨租户访问上报但不阻断", async () => {
      const { promise, query, violations } = callGuard({
        mode: "audit",
        model: "Note",
        operation: "findMany",
        args: { where: { tenant_id: TENANT_B } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalled();
      expect(violations[0]).toMatchObject({ kind: "cross_tenant" });
    });

    it("service_enforced 模型缺少 tenant_slug 时上报", async () => {
      const { promise, violations } = callGuard({
        mode: "audit",
        model: "AuditLog",
        operation: "findMany",
        args: { where: { action: "LOGIN" } },
        tenantId: TENANT_A,
      });

      await promise;
      expect(violations[0]).toMatchObject({
        model: "AuditLog",
        kind: "missing",
      });
    });
  });

  describe("off 模式", () => {
    it("完全不介入", async () => {
      const { promise, query, violations } = callGuard({
        mode: "off",
        model: "Note",
        operation: "findMany",
        args: {},
        tenantId: TENANT_A,
      });

      await promise;
      expect(query).toHaveBeenCalledWith({});
      expect(violations).toHaveLength(0);
    });
  });
});
