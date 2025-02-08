import * as mediasoup from 'mediasoup';
import type {RtpCodecCapability} from 'mediasoup/node/lib/types';
import process from 'node:process';

export const mediasoupServerPromise = runMediasoupServer();

// Map of websocket peers with their webrtc transports
export const peerList = new Map<
	string,
	{
		webRtcTransport: mediasoup.types.WebRtcTransport<mediasoup.types.AppData>;
		producer1?: mediasoup.types.Producer<mediasoup.types.AppData>;
	}
>();

// Stores a self-defined clientId and the corresponding data, like "WebRtcTransport" for that client
export const connectedClients = new Map<
	string,
	{
		// all webrtc transports for this client (because i probably need send and receive transports in parallel for the same client);
		transports: Array<mediasoup.types.WebRtcTransport<mediasoup.types.AppData>>;
	}
>();

export const producers = new Map<string, mediasoup.types.Producer<mediasoup.types.AppData>>();

export const consumers = new Map<string, mediasoup.types.Consumer<mediasoup.types.AppData>>();

// Extend later for scaling up
// export const mediasoupWorkers: Array<Worker<AppData>> = [];

async function runMediasoupServer() {
	const mediaCodecs = [
		{
			kind: 'audio',
			mimeType: 'audio/opus',
			clockRate: 48000,
			channels: 2,
		},
		{
			kind: 'video',
			mimeType: 'video/VP8',
			clockRate: 90000,
			parameters: {
				'x-google-start-bitrate': 1000,
			},
		},
		{
			kind: 'video',
			mimeType: 'video/VP9',
			clockRate: 90000,
			parameters: {
				'profile-id': 2,
				'x-google-start-bitrate': 1000,
			},
		},
		{
			kind: 'video',
			mimeType: 'video/h264',
			clockRate: 90000,
			parameters: {
				'packetization-mode': 1,
				'profile-level-id': '4d0032',
				'level-asymmetry-allowed': 1,
				'x-google-start-bitrate': 1000,
			},
		},
		{
			kind: 'video',
			mimeType: 'video/h264',
			clockRate: 90000,
			parameters: {
				'packetization-mode': 1,
				'profile-level-id': '42e01f',
				'level-asymmetry-allowed': 1,
				'x-google-start-bitrate': 1000,
			},
		},
	] satisfies RtpCodecCapability[];

	const worker = await mediasoup.createWorker({
		logLevel: 'warn',
		logTags: [
			'info',
			'ice',
			'dtls',
			'rtp',
			'srtp',
			'rtcp',
			// 'rtx',
			// 'bwe',
			// 'score',
			// 'simulcast',
			// 'svc'
		],
		dtlsCertificateFile: './assets/dev_cert/cert.pem',
		dtlsPrivateKeyFile: './assets/dev_cert/key.pem',
		rtcMinPort: 10000,
		rtcMaxPort: 10100,
	});

	worker.on('died', () => {
		console.error('mediasoup Worker died, exiting  in 2 seconds...');
		setTimeout(() => process.exit(1), 2000);
	});

	const router = await worker.createRouter({mediaCodecs});

	// announcedAddress is the WLAN IP of my Mac in Zephir UniFi network
	const webRtcServer = await worker.createWebRtcServer({
		listenInfos: [
			{
				protocol: 'udp',
				ip: '0.0.0.0',
				announcedAddress: '127.0.0.1', // Allows tab to tab communication
				// ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
				// announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
				port: 44444,
			},
			{
				protocol: 'tcp',
				ip: '0.0.0.0',
				announcedAddress: '127.0.0.1', // Allows tab to tab communication
				// ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
				// announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
				// bjesuiter: Not providing abounded address should work if all clients can resolve the LAN IP of the Laptop.
				// we only need that for clients outside of LAN or with NAT traversal
				//announcedAddress: "192.168.204.244",
				port: 44444,
			},
		],
	});

	// Now you can use the router to create WebRtcTransports, produce media, etc.
	return {
		worker,
		webRtcServer,
		router,
	};
}
