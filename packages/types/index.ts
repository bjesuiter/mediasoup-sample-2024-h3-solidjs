import type {
  AppData,
  DtlsParameters,
  MediaKind,
  RtpParameters,
  TransportOptions,
} from "mediasoup-client/lib/types";

export type BennyWebsocketEnvelope = {
  command: "WebRtcTransportOptions";
  payload: TransportOptions;
} | {
  command: "getWebRtcTransportOptions";
  payload: void;
} | {
  command: "Error";
  payload: string;
} | {
  command: "connectWebRtcTransport";
  payload: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  };
} | {
  command: "newProducer";
  payload: {
    transportId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
    appData: AppData;
  };
};
