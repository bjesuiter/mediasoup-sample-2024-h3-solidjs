import {
  connectedClients,
  mediasoupServerPromise,
  producers,
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

  // Step 0 for sending & receiving: connectClient
  connectClient: publicProcedure.mutation(async ({ ctx }) => {
    if (connectedClients.has(ctx.sessionId)) {
      logger.info(`Known client reconnected: ${ctx.sessionId}`);
      return ctx.sessionId;
    }

    // init new client with empty transports
    connectedClients.set(ctx.sessionId, {
      transports: [],
    });
    logger.info(`New client connected: ${ctx.sessionId}`);

    return ctx.sessionId;
  }),

  // Step 1 for sending & receiving: getServerRtpCapabilities
  getServerRtpCapabilities: publicProcedure.query(async () => {
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),

  // Step 2 for sending: createWebRtcTransport
  createServerWebRtcTransport: publicProcedure.mutation(async ({ ctx }) => {
    const clientUuid = ctx.sessionId;
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
    const client = connectedClients.get(clientUuid);
    if (!client) {
      logger.error(`Client not found: ${clientUuid}`);
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
    transportId: z.string(),
    // TODO: check typing against DtlsParameters of mediasoup-client
    dtlsParameters: z.any(),
  })).mutation(async ({ input, ctx }) => {
    const clientUuid = ctx.sessionId;
    const client = connectedClients.get(clientUuid);

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

  // Step 4: createProducer
  createProducer: publicProcedure.input(z.object({
    transportId: z.string(),
    kind: z.enum(["audio", "video"]),
    rtpParameters: z.any(),
    appData: z.any(),
  })).mutation(async ({ input, ctx }) => {
    const clientUuid = ctx.sessionId;
    const client = connectedClients.get(clientUuid);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot create producer, client not found for client id: ${clientUuid}`,
      });
    }

    const transport = client?.transports.find(
      (t) => t.id === input.transportId,
    );
    if (!transport) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot create producer, transport not found for transport id: ${input.transportId}`,
      });
    }

    const producer = await transport.produce({
      id: input.transportId,
      kind: input.kind,
      rtpParameters: input.rtpParameters as RtpParameters,
      appData: input.appData as AppData,
    });
    producers.set(producer.id, producer);

    return {
      producerServerId: producer.id,
    };
  }),
});

// Export type router type signature,
// NOT the router itself.
export type TrpcRouter = typeof trpcRouter;
