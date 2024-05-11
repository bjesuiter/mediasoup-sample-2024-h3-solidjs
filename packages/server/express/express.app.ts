import express from "express";
import { initTRPC } from "@trpc/server";
import { type Context, createContext } from "../trpc/trpc";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "../trpc/trpc.router";

// Initialization of tRPC Express Adapter
const t = initTRPC.context<Context>().create();

export const expressApp = express();

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);
