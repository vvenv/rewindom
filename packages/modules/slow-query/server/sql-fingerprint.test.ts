import { describe, it, expect } from "vitest";

import { fingerprintSql } from "./sql-fingerprint.js";

describe("fingerprintSql", () => {
  it("normalizes dollar-parameterized queries", () => {
    const sql = `SELECT "Document"."id", "Document"."status" FROM "Document" WHERE "Document"."tenant_id" = $1 AND "Document"."status" = $2 ORDER BY "Document"."created_at" DESC LIMIT $3 OFFSET $4`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain('SELECT');
    expect(fp).toContain('"DOCUMENT"');
    expect(fp).toContain('WHERE');
    expect(fp).toContain('TENANT_ID');
    expect(fp).not.toContain("$1");
    expect(fp).not.toContain("$2");
  });

  it("replaces IN ($1, $2) placeholders", () => {
    const sql = `SELECT * FROM "Document" WHERE "status" IN ($1, $2, $3)`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain("IN (?)");
    expect(fp).not.toContain("$1");
  });

  it("replaces string literals with '?'", () => {
    const sql = `SELECT * FROM "Tenant" WHERE "name" = '默认租户'`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain("'?'");
    expect(fp).not.toContain("默认");
  });

  it("replaces numeric literals with '?'", () => {
    const sql = `UPDATE "Product" SET "price" = 100 WHERE "id" = 'abc'`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain("= ?");
  });

  it("excludes LIMIT and OFFSET values", () => {
    const sql = `SELECT * FROM "Document" LIMIT 20 OFFSET 40`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain("LIMIT ?");
    expect(fp).toContain("OFFSET ?");
  });

  it("collapses whitespace and uppercases", () => {
    const sql = `select  *\nfrom  "tenant"\nwhere  id  =  $1`;

    const fp = fingerprintSql(sql);

    expect(fp).toBe(`SELECT * FROM "TENANT" WHERE ID = ?`);
  });

  it("handles BETWEEN with parameters", () => {
    const sql = `SELECT * FROM "SlowQueryLog" WHERE "created_at" BETWEEN $1 AND $2`;

    const fp = fingerprintSql(sql);

    expect(fp).toContain("BETWEEN ? AND ?");
  });

  it("handles empty/trivial SQL", () => {
    expect(fingerprintSql("")).toBe("");
    expect(fingerprintSql("SELECT 1")).toBe("SELECT ?");
  });

  it("produces consistent fingerprints for same structure", () => {
    const sql1 = `SELECT "id" FROM "Document" WHERE "tenant_id" = 'abc' AND "status" = 'ready'`;
    const sql2 = `SELECT "id" FROM "Document" WHERE "tenant_id" = 'xyz' AND "status" = 'processing'`;

    const fp1 = fingerprintSql(sql1);
    const fp2 = fingerprintSql(sql2);

    expect(fp1).toBe(fp2);
  });
});
