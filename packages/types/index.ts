import type { TransportOptions } from "mediasoup-client/lib/types";

export type BennyWebsocketEnvelope = {
  command: "WebRtcTransportOptions";
  payload: TransportOptions;
} | {
  command: "getWebRtcTransportOptions";
  payload: void;
} | {
  command: "Error";
  payload: string;
};
