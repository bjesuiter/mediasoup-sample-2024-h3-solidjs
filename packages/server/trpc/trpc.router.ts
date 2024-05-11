import {
  connectedClients,
  mediasoupServerPromise,
} from "../mediasoup/mediasoupServer";
import { logger } from "../utils/logger";
import { publicProcedure, router } from "./trpc.base";
import { z } from "zod";

import type {
  AppData,
  DtlsParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
  TransportOptions,
} from "mediasoup-client/lib/types";
import { TRPCError } from "@trpc/server";

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

    logger.info(`Client connected: ${newClientUuid}`);
    return newClientUuid;
  }),

  // Step 2 for sending: createWebRtcTransport
  createServerWebRtcTransport: publicProcedure
    .input(z.object({
      clientUuid: z.string(),
    })).mutation(async ({ input }) => {
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

      // store webRtcTransport for this client
      const client = connectedClients.get(input.clientUuid);
      if (!client) {
        logger.error(`Client not found: ${input.clientUuid}`);
        return;
      }

      client.transports.push(webRtcTransport);

      const transportOptions = {
        id: webRtcTransport.id,
        iceParameters: webRtcTransport.iceParameters,
        iceCandidates: webRtcTransport.iceCandidates,
        dtlsParameters: webRtcTransport.dtlsParameters,
      } satisfies TransportOptions;

      return {
        transportId: webRtcTransport.id,
        transportOptions,
      };
    }),

  // Step 3: connectWebRtcTransport
  connectWebRtcTransport: publicProcedure.input(z.object({
    clientUuid: z.string(),
    transportId: z.string(),
    // TODO: check typing against DtlsParameters of mediasoup-client
    dtlsParameters: z.any(),
  })).mutation(async ({ input }) => {
    const client = connectedClients.get(input.clientUuid);

    const transport = client?.transports.find(
      (t) => t.id === input.transportId,
    );
    if (!transport) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot connect, transport not found for transport id: ${input.transportId}`,
      });
    }

    await transport.connect({
      dtlsParameters: input.dtlsParameters as DtlsParameters,
    });
  }),
});

// Export type router type signature,
// NOT the router itself.
export type TrpcRouter = typeof trpcRouter;
