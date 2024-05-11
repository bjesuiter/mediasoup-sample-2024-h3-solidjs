import * as mediasoup from "mediasoup";
import process from "node:process";

export const mediasoupServerPromise: Promise<{
  router: mediasoup.types.Router<mediasoup.types.AppData>;
  worker: mediasoup.types.Worker<mediasoup.types.AppData>;
}> = runMediasoupServer();

// Map of websocket peers with their webrtc transports
export const peerList = new Map<
  string,
  {
    webRtcTransport: mediasoup.types.WebRtcTransport<mediasoup.types.AppData>;
    producer1?: mediasoup.types.Producer<mediasoup.types.AppData>;
  }
>();

// Stores a self-defined clientId and the corresponding data, like "WebRtcTransport" for that client
export const connectedClients = new Map<string, {
  // all webrtc transports for this client (because i probably need send and receive transports in parallel for the same client);
  transports: Array<mediasoup.types.WebRtcTransport<mediasoup.types.AppData>>;
}>();

async function runMediasoupServer() {
  const mediaCodecs = [
    {
      kind: "audio" as const,
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video" as const,
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {
        "x-google-start-bitrate": 1000,
      },
    },
  ];

  const worker = await mediasoup.createWorker({
    logLevel: "warn",
    logTags: [
      "info",
      "ice",
      "dtls",
      "rtp",
      "srtp",
      "rtcp",
      // 'rtx',
      // 'bwe',
      // 'score',
      // 'simulcast',
      // 'svc'
    ],
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on("died", () => {
    console.error("mediasoup Worker died, exiting  in 2 seconds...");
    setTimeout(() => process.exit(1), 2000);
  });

  const router = await worker.createRouter({ mediaCodecs });

  // Now you can use the router to create WebRtcTransports, produce media, etc.
  return {
    router,
    worker,
  };
}
