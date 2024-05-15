import {
  connectedClients,
  consumers,
  mediasoupServerPromise,
  producers,
} from "../mediasoup/mediasoupServer";
import { logger } from "../utils/logger";
import { publicProcedure, router } from "./trpc.base";
import { z } from "zod";
import type { ConsumerOptions } from "mediasoup-client/lib/types";

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

  // Step 0 for sending & receiving: connectClient - not needed right now
  // connectClient: publicProcedure.mutation(async ({ ctx }) => {
  //   if (connectedClients.has(ctx.sessionId)) {
  //     logger.info(`Known client reconnected: ${ctx.sessionId}`);
  //     return ctx.sessionId;
  //   }

  //   return ctx.sessionId;
  // }),

  // Util
  getSessionId: publicProcedure.query(({ ctx }) => ctx.sessionId),

  // Step 1 for sending & receiving: getServerRtpCapabilities
  getServerRtpCapabilities: publicProcedure.query(async () => {
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),

  // Step 2 for sending: createWebRtcTransport
  createServerWebRtcTransport: publicProcedure.mutation(async ({ ctx }) => {
    const clientUuid = ctx.sessionId;
    const { router, webRtcServer } = await mediasoupServerPromise;
    const webRtcTransport = await router.createWebRtcTransport(
      {
        // listening ip and port etc. are set on the webRtcServer
        webRtcServer: webRtcServer,
        /**
         * Enables User Datagram Protocol (UDP) for the transport.
         * UDP is often preferred for real-time media due to its lower latency compared to TCP.
         */
        enableUdp: true,
        /**
         * Enables Transmission Control Protocol (TCP) for the transport.
         * TCP may be used if UDP is blocked or unreliable on the network.
         */
        enableTcp: true,
        /**
         * Prefers UDP over TCP for the transport.
         * Helps ensure lower latency if both protocols are enabled.
         */
        preferUdp: true,

        // copied from example: https://github.com/versatica/mediasoup-demo/blob/210109ac6e039bbdc21d7d210a0457f090c05a4e/server/lib/Room.js
        iceConsentTimeout: 20,
        enableSctp: false,

        // copied from: https://github.com/versatica/mediasoup-demo/blob/v3/server/config.example.js
        initialAvailableOutgoingBitrate: 1000000,
        maxSctpMessageSize: 262144,
        // minimumAvailableOutgoingBitrate: 600000,
      },
    );

    // store webRtcTransport for this client
    const client = connectedClients.get(clientUuid);
    if (!client) {
      logger.error(
        `Cannot create webRtcTransport: Client Session not found: ${clientUuid}`,
      );
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
          `Cannot create producer, client session not found for client id: ${clientUuid}`,
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

    logger.debug(`Creating producer for transport: ${input.transportId}`);

    const producer = await transport.produce({
      id: crypto.randomUUID(),
      kind: input.kind,
      rtpParameters: input.rtpParameters as RtpParameters,
      appData: input.appData as AppData,
    });
    producers.set(producer.id, producer);

    logger.debug(`Producer Created`, {
      webRtcTransportId: input.transportId,
      producerServerId: producer.id,
    });

    return {
      producerServerId: producer.id,
    };
  }),

  // RECEIVER SIDE
  getAvailableProducers: publicProcedure.query(async ({ ctx }) => {
    const clientUuid = ctx.sessionId;
    const client = connectedClients.get(clientUuid);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot get available producers, client session not found for client id: ${clientUuid}`,
      });
    }

    const availableProducers = Array.from(producers.values()).map((p) => ({
      id: p.id,
      kind: p.kind,
    }));

    return availableProducers;
  }),

  // Utility function to check if a device can consume a producer
  canDeviceConsumeProducer: publicProcedure.input(z.object({
    selectedProducerId: z.string(),
    deviceRtpCapabilities: z.any(),
  })).query(async ({ input }) => {
    const producer = producers.get(input.selectedProducerId);

    if (!producer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot create consumer, producer not found for producer id: ${input.connectToProducerId}`,
      });
    }

    const { router } = await mediasoupServerPromise;
    const canConsume = router.canConsume({
      producerId: input.selectedProducerId,
      rtpCapabilities: input.deviceRtpCapabilities,
    });

    // logger.debug(`Can device consume producer`, {
    //   producerRtpCapabilities: producer.rtpParameters,
    //   deviceRtpCapabilities: input.deviceRtpCapabilities,
    //   canConsume: canConsume,
    // });

    return canConsume;
  }),

  createConsumer: publicProcedure.input(z.object({
    selectedProducerId: z.string(),
    transportId: z.string(),
    deviceRtpCapabilities: z.any(),
  }))
    .mutation(async ({ input, ctx }) => {
      const producer = producers.get(input.selectedProducerId);

      if (!producer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            `Cannot create consumer, producer not found for producer id: ${input.selectedProducerId}`,
        });
      }

      const { router } = await mediasoupServerPromise;
      const canConsume = router.canConsume({
        producerId: input.selectedProducerId,
        rtpCapabilities: input.deviceRtpCapabilities,
      });

      // For deep dive debugging
      // logger.debug(`Can device consume producer`, {
      //   producerRtpCapabilities: producer.rtpParameters,
      //   deviceRtpCapabilities: input.deviceRtpCapabilities,
      //   canConsume: canConsume,
      // });

      if (!canConsume) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            `Cannot create consumer, device cannot consume producer with producerId: ${input.selectedProducerId}`,
        });
      }

      const transport = connectedClients.get(ctx.sessionId)?.transports.find((
        transport,
      ) => transport.id === input.transportId);

      if (!transport) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            `Cannot create consumer, transport not found for transport id: ${input.transportId}`,
        });
      }

      const consumer = await transport.consume({
        producerId: input.selectedProducerId,
        rtpCapabilities: input.deviceRtpCapabilities,
        paused: true,
      });
      consumers.set(consumer.id, consumer);

      // Generate consumer options for the client
      const consumerOptions = {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        appData: consumer.appData,
      } satisfies ConsumerOptions;

      return consumerOptions;
    }),

  resumeConsumer: publicProcedure.input(z.object({
    consumerId: z.string(),
  })).mutation(async ({ input }) => {
    const consumer = consumers.get(input.consumerId);

    if (!consumer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          `Cannot resume consumer, consumer not found for consumer id: ${input.consumerId}`,
      });
    }

    await consumer.resume();
  }),
});

// Export type router type signature,
// NOT the router itself.
export type TrpcRouter = typeof trpcRouter;
