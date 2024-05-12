import { createTRPCProxyClient, httpLink } from "@trpc/client";
import type { TrpcRouter } from "server/trpc/trpc.router";

// Pass AppRouter as generic here. 👇 This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
export const trpcClient = createTRPCProxyClient<TrpcRouter>({
  links: [
    // using httpLink instead of httpBatchLink, since httpBatchLink seems to produce duplicated session ids on the server
    httpLink({
      url: "http://localhost:4000/trpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          // allow cross-origin credential cookies to be sent to trpc endpoint
          credentials: "include",
        });
      },
    }),
  ],
});
