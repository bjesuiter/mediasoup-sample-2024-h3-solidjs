import express from "express";
import { createContext } from "../trpc/trpc.base";
import * as trpcExpress from "@trpc/server/adapters/express";
import { trpcRouter } from "../trpc/trpc.router";
import cors from "cors";
import session from "express-session";
import sqlite from "better-sqlite3";
// @ts-expect-error - no types available
import sqliteStoreFactory from "better-sqlite3-session-store";

export const expressApp = express();

expressApp.use(cors({ origin: "http://localhost:8000", credentials: true }));

const SqliteSessionStore = sqliteStoreFactory(session);
const db = new sqlite("sessions.db", { verbose: console.log });
const sessionStore = new SqliteSessionStore({
  client: db,
  expired: {
    clear: true,
    intervalMs: 900000, //ms = 15min
  },
});

// https://www.npmjs.com/package/express-session
expressApp.use(session({
  secret: "my-secret",
  saveUninitialized: false,
  resave: false,
  // store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day,
    sameSite: "lax", // reLAXed CSRF - Cross Site Request Forgery
    httpOnly: true,
    // if true, cookie only works in https
    secure: false,
    domain: "localhost:8000", // cookie only works if request comes from this domain
  },
}));

expressApp.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: trpcRouter,
    createContext,

    // disable batching since it seems to produce duplicated session ids on the server
    batching: {
      enabled: false,
    },
  }),
);
