import type {
  AppData,
  DtlsParameters,
  MediaKind,
  RtpCapabilities,
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
    // custom property of bjesuiter
    producerClientId: string;
  };
} | {
  command: "ServerSideProducerCreated";
  payload: {
    // official id of the producer on the server side
    producerServerId: string;

    // custom property of bjesuiter to identify the producer "creation request" on the client side
    producerClientId: string;
  };
} | {
  command: "newConsumer";
  payload: {
    producerId: string;
    deviceRtpCapabilities: RtpCapabilities;
    consumerClientId: string;
  };
} | {
  command: "ServerSideConsumerCreated";
  payload: {
    // official id of the consumer on the server side
    consumerServerId: string;

    // custom property of bjesuiter to identify the consumer "creation request" on the client side
    consumerClientId: string;
  };
};
