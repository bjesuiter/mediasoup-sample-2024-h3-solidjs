import { initTRPC } from "@trpc/server";
import * as express from "express";
import { getCookie, setCookie } from "./cookie-utils";
import type { CookieSerializeOptions } from "cookie";

// Factory for trpc context for 'express' adapter - created per request
export const createContext = ({
  req,
  res,
}: { req: express.Request; res: express.Response }) => {
  const sessionId = req.sessionID;

  return {
    // req,
    // res,
    sessionId,
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
