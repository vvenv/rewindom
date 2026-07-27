/**
 * Vitest runs this before test files import app modules.
 * dotenv in config.ts does not override existing env vars, so these values
 * keep unit tests deterministic regardless of the developer's .env.
 */
import "./register-prisma-mock.js";

process.env.NODE_ENV ??= "test";
process.env.VITEST ??= "true";
