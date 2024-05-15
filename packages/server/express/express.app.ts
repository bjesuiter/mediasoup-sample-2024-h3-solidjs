import express from "express";
import { createContext } from "../trpc/trpc.base";
import * as trpcExpress from "@trpc/server/adapters/express";
import { trpcRouter } from "../trpc/trpc.router";
import cors from "cors";
import session from "express-session";

export const expressApp = express();

expressApp.use(
  cors({
    origin: ["http://localhost:8000", "http://192.168.204.244:8000"],
    credentials: true,
  }),
);

// https://www.npmjs.com/package/express-session
expressApp.use(session({
  secret: "my-secret",
  // only use cookies via https
  cookie: { secure: false },
  saveUninitialized: true,
  resave: false,
}));

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: trpcRouter,
    createContext,
  }),
);
