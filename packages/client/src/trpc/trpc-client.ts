import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "server/trpc/trpc.router";
//     👆 **type-only** import of trpc app router

// Pass AppRouter as generic here. 👇 This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:4000/trpc",
    }),
  ],
});