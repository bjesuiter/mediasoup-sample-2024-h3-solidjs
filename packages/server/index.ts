import { createApp, defineEventHandler, defineWebSocketHandler } from "h3";
import { mediasoupServerPromise } from "./mediasoup/mediasoupServer";

export const app = createApp({});

// open: http://localhost:3000/
app.use(
  "/", // Root path
  defineEventHandler(() =>
    fetch(
      "https://raw.githubusercontent.com/unjs/crossws/main/examples/h3/public/index.html",
    ).then((r) => r.text())
  ),
  {
    match: (url) => url === "/",
  },
);

// open: http://localhost:3000/getServerRtpCapabilities
app.use(
  "/getServerRtpCapabilities",
  defineEventHandler(async () => {
    const { router } = await mediasoupServerPromise;
    return router.rtpCapabilities;
  }),
);

app.use(
  "/_ws",
  defineWebSocketHandler({
    async open(peer) {
      console.log("[ws] open", peer);
      // 1. When client connects:
      const soupServer = await mediasoupServerPromise;

      // const router = soupServer.router.createD;
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
