import {
  createApp,
  createRouter,
  defineEventHandler,
  defineWebSocketHandler,
  handleCors,
} from "h3";
import { mediasoupServerPromise, peerList } from "./mediasoup/mediasoupServer";
import type { BennyWebsocketEnvelope } from "types";
import type { TransportOptions } from "mediasoup-client/lib/types";
import { env } from "bun";

export const app = createApp({});
const h3Router = createRouter();

// open: http://localhost:3000/
h3Router.get(
  "/",
  defineEventHandler(() =>
    fetch(
      "https://raw.githubusercontent.com/unjs/crossws/main/examples/h3/public/index.html",
    ).then((r) => r.text())
  ),
);

// open: http://localhost:3000/getServerRtpCapabilities
h3Router.get(
  "/getServerRtpCapabilities",
  defineEventHandler(async (event) => {
    handleCors(event, { origin: "*" });
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),
);

h3Router.get(
  "/_ws",
  defineWebSocketHandler({
    async open(peer) {
      console.log("[ws] open", peer);
      // 1. When client connects: createWebRtcTransport
      const soupServer = await mediasoupServerPromise;
      const webRtcTransport = await soupServer.router.createWebRtcTransport(
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

      // store the new webRtcTransport in the peerList, to be able to access it later
      peerList.set(peer.id, { webRtcTransport });
    },

    async message(peer, message) {
      console.log("[ws] message", peer, message);
      if (message.text() === "ping") {
        peer.send("pong");
        return;
      }

      const envelope = JSON.parse(message.text()) as BennyWebsocketEnvelope;

      // Respond to getWebRtcTransportOptions()
      if (envelope.command.startsWith("getWebRtcTransportOptions")) {
        // 2. When client requests WebRtcTransportOptions: getWebRtcTransportOptions
        const { webRtcTransport } = peerList.get(peer.id) ??
          { webRtcTransport: undefined };

        if (!webRtcTransport) {
          peer.send({
            command: "error",
            payload: "No WebRtcTransport found for this websocket connection!",
          });
          return;
        }

        const transportOptions = {
          id: webRtcTransport.id,
          iceParameters: webRtcTransport.iceParameters,
          iceCandidates: webRtcTransport.iceCandidates,
          dtlsParameters: webRtcTransport.dtlsParameters,
        };

        peer.send(
          JSON.stringify(
            {
              command: "WebRtcTransportOptions",
              payload: transportOptions,
            } satisfies BennyWebsocketEnvelope,
          ),
        );
      }

      if (envelope.command.startsWith("connectWebRtcTransport")) {
        const { webRtcTransport } = peerList.get(peer.id) ?? {
          webRtcTransport: undefined,
        };

        const { dtlsParameters } = envelope.payload as TransportOptions;

        if (!webRtcTransport) {
          peer.send({
            command: "error",
            payload: "No WebRtcTransport found for this websocket connection!",
          });
          return;
        }

        await webRtcTransport.connect({ dtlsParameters });
      }

      if (envelope.command === "newProducer") {
        const { webRtcTransport } = peerList.get(peer.id) ??
          { webRtcTransport: undefined };
        const producerClientId = envelope.payload.producerClientId;

        if (!webRtcTransport) {
          peer.send({
            command: "error",
            payload: "No WebRtcTransport found for this websocket connection!",
          });
          return;
        }

        const producer = await webRtcTransport?.produce(envelope.payload);

        if (!producer) {
          peer.send({
            command: "error",
            payload:
              "Error to create producer on server side for producerClientId `${producerClientId}`",
          });
          return;
        }

        peerList.set(peer.id, { webRtcTransport, producer1: producer });

        peer.send(
          JSON.stringify(
            {
              command: "ServerSideProducerCreated",
              payload: {
                producerServerId: producer.id,
                producerClientId,
              },
            } satisfies BennyWebsocketEnvelope,
          ),
        );
      }
    },

    close(peer, event) {
      console.log("[ws] close", peer, event);
    },

    error(peer, error) {
      console.log("[ws] error", peer, error);
    },
  }),
);

app.use(h3Router);
