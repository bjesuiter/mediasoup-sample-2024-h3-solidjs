import type { AppData } from "mediasoup/node/lib/types";

export type BennyWebsocketEnvelope = {
  command: "WebRtcTransportOptions";
  payload: AppData;
} | {
  command: "getWebRtcTransportOptions";
  payload: void;
};
