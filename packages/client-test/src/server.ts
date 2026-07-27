import { setupServer } from "msw/node";

import { defaultHandlers } from "./handlers.js";

/**
 * MSW test server for node/happy-dom environments.
 */
export const server = setupServer(...defaultHandlers);
