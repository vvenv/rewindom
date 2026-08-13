import { success } from "@rewindom/shared";

import { handleRouteError } from "./route-error-handler.js";

import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
  RouteOptions,
} from "fastify";

type DefineRouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<unknown>;

export type DefineRouteOptions<
  RouteGeneric extends RouteOptions = RouteOptions,
> = Omit<RouteGeneric, "handler"> & {
  context: string;
  errorCode: string;
  handler: DefineRouteHandler;
};

/**
 * Registers a route with standardized try/catch and `{ data }` success wrapping.
 * Return a value from the handler to send `success(result)` when `reply.sent` is false.
 * Use `reply.code(...).send(...)` directly for non-200 or error responses.
 */
export function defineRoute<RouteGeneric extends RouteOptions = RouteOptions>(
  app: FastifyInstance,
  opts: DefineRouteOptions<RouteGeneric>,
): void {
  const { context, errorCode, handler: userHandler, ...routeOpts } = opts;

  const wrappedHandler: RouteHandlerMethod = async (request, reply) => {
    try {
      const result = await userHandler(request, reply);
      if (result !== undefined && !reply.sent) {
        return success(result);
      }
    } catch (err) {
      handleRouteError(reply, err, context, errorCode);
    }
  };

  app.route({
    ...routeOpts,
    handler: wrappedHandler,
  } as RouteOptions);
}
