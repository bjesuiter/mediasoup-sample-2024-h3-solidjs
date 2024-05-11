import {
  connectedClients,
  mediasoupServerPromise,
} from "../mediasoup/mediasoupServer";
import { publicProcedure, router } from "./trpc.base";

export const trpcRouter = router({
  ping: publicProcedure.query(() => "pong"),

  // Step 1 for sending & receiving: getServerRtpCapabilities
  getServerRtpCapabilities: publicProcedure.query(async () => {
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),

  // Step 2 for sending & receiving: connectClient
  connectClient: publicProcedure.mutation(async () => {
    // basically a random id for each connected browser
    const newClientUuid = crypto.randomUUID();
    // init new client with empty transports
    connectedClients.set(newClientUuid, {
      transports: [],
    });
    return newClientUuid;
  }),

  // Step 2 for sending: createWebRtcTransport
  createServerWebRtcTransport: publicProcedure.mutation(async () => {
    const { router } = await mediasoupServerPromise;
    const webRtcTransport = await router.createWebRtcTransport(
      {
        listenInfos: [
          {
            protocol: "udp",
            ip: "0.0.0.0",
            // = public address, if needed
            // announcedAddress: "88.12.10.41",
          },
        ],
        // enableUdp: true,
        // enableTcp: true,
        // preferUdp: true,
      },
    );

    // store webRtcTransport for this client;
    // TODO: finish
  }),
});

// Export type router type signature,
// NOT the router itself.
export type TrpcRouter = typeof trpcRouter;
