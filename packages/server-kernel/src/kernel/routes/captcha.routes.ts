import { handleValidationError } from "../../http/route-error-handler.js";
import { CaptchaService } from "../auth/captcha.service.js";

import type { FastifyInstance } from "fastify";

export async function captchaRoutes(app: FastifyInstance) {
  // Generate captcha challenge - GET /api/captcha/challenge
  app.get("/challenge", async (request, reply) => {
    try {
      const challenge = CaptchaService.generateChallenge();
      return reply.send({ data: challenge });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: "服务器内部错误" });
    }
  });

  // Verify captcha - POST /api/captcha/verify
  app.post("/verify", async (request, reply) => {
    try {
      const { id, token, x, y } = request.body as {
        id: string;
        token: string;
        x: number;
        y: number;
      };

      if (!id || !token || x === undefined || y === undefined) {
        return handleValidationError(reply, "缺少必填字段");
      }

      const isValid = CaptchaService.verify({ id, token, x, y });

      if (isValid) {
        return reply.send({ data: { valid: true } });
      } else {
        return handleValidationError(reply, "验证码错误");
      }
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: "服务器内部错误" });
    }
  });
}
