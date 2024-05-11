import {createEffect, createResource, createSignal} from 'solid-js';
import {trpcClient} from '../../trpc/trpc-client';
import * as mediasoupClient from 'mediasoup-client';
import {AudioDeviceSelector} from './AudioDeviceSelector';
import {ProducerOptions} from 'mediasoup-client/lib/types';

export function SendTrpcPage() {
	// Step 0: Connect with the server which assigns a new clientUuid (aka sessionId)
	const [clientUuid] = createResource(async () => {
		const clientUuid = await trpcClient.connectClient.mutate();
		console.log('Step 2: Connected to server', {clientUuid});
		return clientUuid;
	});

	// Step 1: Get ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const serverRtpCapabilities = await trpcClient.getServerRtpCapabilities.query();
		console.log('Step 1: serverRtpCapabilities', serverRtpCapabilities);
		return serverRtpCapabilities;
	});

	// Step 3 & 4: Create device and load serverRtpCapabilities into it
	// const [device] = createResource(
	// 	() => ({
	// 		serverRtpCaps: serverRtpCapabilities(),
	// 	}),
	// 	async ({serverRtpCaps}) => {
	// 		if (!serverRtpCaps) return;

	// 		// Step 3: Create a device
	// 		const device = new mediasoupClient.Device();

	// 		//Step 4: Call device.load with serverRtpCapabilities
	// 		await device.load({routerRtpCapabilities: serverRtpCaps});

	// 		console.log('Step 3 & 4: device', device);

	// 		return device;
	// 	}
	// );

	// Step 5: Create a transport for sending audio
	// const [sendTransport] = createResource(
	// 	() => ({
	// 		device: device(),
	// 		clientUuid: clientUuid(),
	// 	}),
	// 	async ({device, clientUuid}) => {
	// 		if (!device || !clientUuid) return;
	// 		const serverTransport = await trpcClient.createServerWebRtcTransport.mutate({
	// 			clientUuid: clientUuid,
	// 		});

	// 		if (!serverTransport) {
	// 			console.error(`Server transport not created!`);
	// 			return;
	// 		}

	// 		const sendTransport = device.createSendTransport(serverTransport.transportOptions);

	// 		// Adding event listeners for 'connect' and 'produce'
	// 		// Connects the transport lazily, when the first producer wants to send data
	// 		sendTransport.on('connect', async ({dtlsParameters}, callback, errback) => {
	// 			try {
	// 				await trpcClient.connectWebRtcTransport.mutate({
	// 					clientUuid,
	// 					transportId: sendTransport.id,
	// 					dtlsParameters,
	// 				});
	// 				// go on with client side processing of webrtc (for example: creating producers, etc.)
	// 				callback();
	// 				console.info('Step 5b: sendTransport connected');
	// 			} catch (error: unknown) {
	// 				errback(
	// 					new Error(
	// 						`Error while sending DTLS parameters: ${JSON.stringify(error, undefined, '\t')}`
	// 					)
	// 				);
	// 			}
	// 		});

	// 		sendTransport.on('produce', async ({kind, rtpParameters, appData}, callback, errback) => {
	// 			// Signal parameters to the server side transport and retrieve the id of
	// 			// the server side new producer.
	// 			try {
	// 				const result = await trpcClient.createProducer.mutate({
	// 					clientUuid,
	// 					transportId: sendTransport.id,
	// 					kind,
	// 					rtpParameters,
	// 					appData,
	// 				});

	// 				callback({id: result.producerServerId});
	// 			} catch (error: unknown) {
	// 				errback(
	// 					new Error(
	// 						`Error while sending DTLS parameters: ${JSON.stringify(error, undefined, '\t')}`
	// 					)
	// 				);
	// 			}
	// 		});

	// 		console.log('Step 5a: sendTransport', sendTransport);
	// 		return sendTransport;
	// 	}
	// );

	// Step 6: Create a media track (set by a component in the template)
	const [stream, setStream] = createSignal<MediaStream | undefined>();

	// Step 7: Create a producer
	// const [producer] = createResource(
	// 	() => ({
	// 		sendTransport: sendTransport(),
	// 		stream: stream(),
	// 	}),
	// 	async ({sendTransport, stream}) => {
	// 		if (!sendTransport || !stream) return;

	// 		const audioTrack = stream.getAudioTracks()[0];
	// 		console.log('Step 7: audioTrack', audioTrack);

	// 		if (!audioTrack) {
	// 			console.error('Step 7: createProducer: No audioTrack available');
	// 		}

	// 		// Options for the producer are optional! :)
	// 		const options = {
	// 			track: audioTrack,
	// 			// encodings: [{ssrc: 111111}],
	// 			// codecOptions: {},
	// 			// codec: {kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2},
	// 		} satisfies ProducerOptions;

	// 		const producer = await sendTransport.produce(options);

	// 		console.log('Step 7: Finished producer', producer);
	// 		return producer;
	// 	}
	// );

	// debug effect to force recomputation of resources
	createEffect(() => {
		// device();
		clientUuid();
		// sendTransport();
		// producer();
	});

	return (
		<div style="display: flex; flex-flow: column nowrap; gap: 24px; padding: 16px">
			<h1>Send Audio (with trpc + mediasoup)</h1>
			<fieldset>
				<legend>Infos</legend>
				<div style="display: flex; flex-flow: column nowrap; gap: 24px; padding: 16px">
					<span>clientUuid: {clientUuid()}</span>
					<span>Stream: {stream()?.getAudioTracks()[0].label}</span>
				</div>
			</fieldset>

			<AudioDeviceSelector onDeviceSelected={stream => setStream(stream)} />
		</div>
	);
}
