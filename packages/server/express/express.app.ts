import express from "express";
import { createContext } from "../trpc/trpc.base";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "../trpc/trpc.router";

export const expressApp = express();

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);
