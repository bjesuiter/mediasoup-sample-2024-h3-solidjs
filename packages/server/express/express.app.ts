import express from "express";
import { createContext } from "../trpc/trpc.base";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "../trpc/trpc.router";
import cors from "cors";

export const expressApp = express();

expressApp.use(cors());

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);
