import {
  createApp,
  createRouter,
  defineEventHandler,
  defineWebSocketHandler,
  handleCors,
} from "h3";
import { mediasoupServerPromise, peerList } from "./mediasoup/mediasoupServer";

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
      peerList.set(peer.id, webRtcTransport);
    },

    message(peer, message) {
      console.log("[ws] message", peer, message);
      if (message.text().includes("ping")) {
        peer.send("pong");
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
