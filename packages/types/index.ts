import type { AppData, WebRtcTransportOptions } from "mediasoup/node/lib/types";

export type BennyWebsocketEnvelope = {
  command: "WebRtcTransportOptions";
  payload: WebRtcTransportOptions<AppData>;
} | {
  command: "getWebRtcTransportOptions";
  payload: void;
};
