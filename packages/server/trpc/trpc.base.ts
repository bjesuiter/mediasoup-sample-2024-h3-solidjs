import { initTRPC } from "@trpc/server";
import * as express from "express";
import { getCookie, setCookie } from "./cookie-utils";
import type { CookieSerializeOptions } from "cookie";
import { connectedClients } from "../mediasoup/mediasoupServer";
import { logger } from "../utils/logger";

// Factory for trpc context for 'express' adapter - created per request
export const createContext = ({
  req,
  res,
}: { req: express.Request; res: express.Response }) => {
  // session management
  let sessionId = getCookie(req, "clientUuid");
  if (!sessionId) {
    // init new session
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

  return {
    // req,
    // res,
    sessionId,
    connectedClient,
    getCookie: (name: string) => getCookie(req, name),
    setCookie: (
      name: string,
      value: string,
      options?: CookieSerializeOptions,
    ) => setCookie(res, name, value, options),
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<TRPCContext>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
