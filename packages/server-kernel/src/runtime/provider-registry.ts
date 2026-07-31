import { AppError } from "../lib/app-errors.js";

import type {
  PublicConfigProvider,
  TenantApiKeyAuthProvider,
  TenantRegistrationProvider,
} from "./provider-contracts.js";
import type { PermissionCatalogEntry } from "@be-water/shared";
import type { FastifyRequest } from "fastify";

export interface AuthzResult {
  allowed: boolean;
  reason?: string;
}

export interface PermissionCatalog {
  permissions: PermissionCatalogEntry[];
  groups: Record<string, readonly string[]>;
}

export interface AuthzProvider {
  check(request: FastifyRequest, permission: string): Promise<AuthzResult>;
  checkAny(
    request: FastifyRequest,
    permissions: string[],
  ): Promise<AuthzResult>;
  getUserPermissions(userId: string): Promise<string[]>;
  getPermissionCatalog(): PermissionCatalog;
}

export class AuthenticatedOnlyAuthz implements AuthzProvider {
  async check(request: FastifyRequest): Promise<AuthzResult> {
    return { allowed: Boolean(request.authUser) };
  }

  async checkAny(request: FastifyRequest): Promise<AuthzResult> {
    return { allowed: Boolean(request.authUser) };
  }

  async getUserPermissions(_userId: string): Promise<string[]> {
    return [];
  }

  getPermissionCatalog(): PermissionCatalog {
    return { permissions: [], groups: {} };
  }
}

/** `app.registry` — 由 apps/server 在装载模块后 decorate。 */
declare module "fastify" {
  interface FastifyInstance {
    registry: ProviderRegistry;
  }
}

export class ProviderRegistry {
  private authz: AuthzProvider = new AuthenticatedOnlyAuthz();
  private publicConfig: PublicConfigProvider = {
    async getPublicConfig() {
      return {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
      };
    },
  };
  private tenantRegistration: TenantRegistrationProvider = {
    async registerTenant() {
      throw new AppError({ code: "tenant.registration_disabled", status: 403 });
    },
  };
  private tenantApiKeyAuth: TenantApiKeyAuthProvider | null = null;

  setAuthzProvider(provider: AuthzProvider): void {
    this.authz = provider;
  }

  getAuthzProvider(): AuthzProvider {
    return this.authz;
  }

  setPublicConfigProvider(provider: PublicConfigProvider): void {
    this.publicConfig = provider;
  }

  getPublicConfigProvider(): PublicConfigProvider {
    return this.publicConfig;
  }

  setTenantRegistrationProvider(provider: TenantRegistrationProvider): void {
    this.tenantRegistration = provider;
  }

  getTenantRegistrationProvider(): TenantRegistrationProvider {
    return this.tenantRegistration;
  }

  setTenantApiKeyAuthProvider(provider: TenantApiKeyAuthProvider): void {
    this.tenantApiKeyAuth = provider;
  }

  getTenantApiKeyAuthProvider(): TenantApiKeyAuthProvider | null {
    return this.tenantApiKeyAuth;
  }

}
