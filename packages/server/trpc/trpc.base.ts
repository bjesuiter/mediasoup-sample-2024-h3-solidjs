import { initTRPC } from "@trpc/server";
import * as express from "express";
import { getCookie, setCookie } from "./cookie-utils";
import type { CookieSerializeOptions } from "cookie";
import { logger } from "../utils/logger";

// Factory for trpc context for 'express' adapter - created per request
export const createContext = ({
  req,
  res,
}: { req: express.Request; res: express.Response }) => {
  logger.debug(`New Request in trpc: `, {
    url: req.url,
    sessionId: req.sessionID,
    // sessionDotId: req.session.id,
    // sessionCookie: req.session.cookie,
    sessionCookieManualRead: getCookie(req, "connect.sid"),
  });

  return {
    // req,
    // res,
    session: req.session,
    sessionId: req.sessionID,
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
