import {createTRPCProxyClient, httpBatchLink} from '@trpc/client';
import type {TrpcRouter} from 'server/trpc/trpc.router';
//     👆 **type-only** import of trpc app router

const serverHOST = import.meta.env.VITE_SERVER_HOST;

// Pass AppRouter as generic here. 👇 This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
export const trpcClient = createTRPCProxyClient<TrpcRouter>({
	links: [
		httpBatchLink({
			url: `${import.meta.env.VITE_SERVER_PROTOCOL}://${serverHOST}/trpc`,
			fetch(url, options) {
				return fetch(url, {
					...options,
					// allow cross-origin credential cookies to be sent to trpc endpoint
					credentials: 'include',
				});
			},
		}),
	],
});
