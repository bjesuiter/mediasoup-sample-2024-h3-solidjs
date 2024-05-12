import type express from "express";
import { getCookie, setCookie } from "../trpc/cookie-utils";
import { logger } from "./logger";
import { connectedClients } from "../mediasoup/mediasoupServer";

/*
 * Gets the session from the request object, creates a new one if it doesn't exist
 */
export function retrieveSession(req: express.Request, res: express.Response) {
  // session management
  let sessionId = getCookie(req, "clientUuid");

  // if no session id, create a new one
  if (!sessionId) {
    const newSessionId = crypto.randomUUID();
    logger.debug(`New session created: ${newSessionId}`);
    setCookie(res, "clientUuid", newSessionId);
    sessionId = newSessionId;
  }

  // init new client with empty transports
  if (sessionId && !connectedClients.has(sessionId)) {
    connectedClients.set(sessionId, {
      transports: [],
    });
    logger.debug(`New connectedClient initialized for session: ${sessionId}`);
  }

  const connectedClient = connectedClients.get(sessionId);

  return { sessionId, connectedClient };
}
