import {createEffect, createResource, createSignal} from 'solid-js';
import {trpcClient} from '../../trpc/trpc-client';
import * as mediasoupClient from 'mediasoup-client';
import {AudioDeviceSelector} from './AudioDeviceSelector';
import {ProducerOptions} from 'mediasoup-client/lib/types';

export function SendTrpcPage() {
	// Step 0: Connect with the server which assigns a new clientUuid (aka sessionId)
	const [clientUuid] = createResource(async () => {
		const clientUuid = await trpcClient.getSessionId.query();
		console.log('Step 2: Connected to server', {clientUuid});
		return clientUuid;
	});
	// check if clientUuid is available - needed to extpress a dependency on clientUuid in other resources
	// so that they wait for it to be available!
	//  The sending of the id will happen via a cookie (since it's my session id)
	const clientUuidAvailable = () => clientUuid() !== undefined;

	// Step 1: Get ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const serverRtpCapabilities = await trpcClient.getServerRtpCapabilities.query();
		console.log('Step 1: serverRtpCapabilities', serverRtpCapabilities);
		return serverRtpCapabilities;
	});

	// Step 2 & 3: Create device and load serverRtpCapabilities into it
	const [device] = createResource(
		() => ({
			serverRtpCaps: serverRtpCapabilities(),
		}),
		async ({serverRtpCaps}) => {
			if (!serverRtpCaps) return;

			// Step 3: Create a device
			const device = new mediasoupClient.Device();

			//Step 4: Call device.load with serverRtpCapabilities
			await device.load({routerRtpCapabilities: serverRtpCaps});

			console.log('Step 2 & 3: device', device);

			return device;
		}
	);

	// Step 4: Create a transport for sending audio
	const [sendTransport] = createResource(
		() => ({
			device: device(),
			clientUuidAvailable: clientUuidAvailable(),
		}),
		async ({device, clientUuidAvailable}) => {
			if (!device || !clientUuidAvailable) return;

			// will get clientUuid via sessionId in cookie
			const serverTransport = await trpcClient.createServerWebRtcTransport.mutate();

			if (!serverTransport) {
				console.error(
					`Server transport creation not successful - server returned undefined - probably error on server!`
				);
				return;
			}

			const sendTransport = device.createSendTransport(serverTransport.transportOptions);

			// Adding event listeners for 'connect' and 'produce'
			// Connects the transport lazily, when the first producer wants to send data
			sendTransport.on('connect', async ({dtlsParameters}, callback, errback) => {
				try {
					await trpcClient.connectWebRtcTransport.mutate({
						transportId: sendTransport.id,
						dtlsParameters,
					});
					// go on with client side processing of webrtc (for example: creating producers, etc.)
					callback();
					console.info('Step 5b: sendTransport connected');
				} catch (error: unknown) {
					errback(
						new Error(
							`Error while sending DTLS parameters: ${JSON.stringify(error, undefined, '\t')}`
						)
					);
				}
			});

			sendTransport.on('produce', async ({kind, rtpParameters, appData}, callback, errback) => {
				// Signal parameters to the server side transport and retrieve the id of
				// the server side new producer.
				try {
					const result = await trpcClient.createProducer.mutate({
						transportId: sendTransport.id,
						kind,
						rtpParameters,
						appData,
					});

					callback({id: result.producerServerId});
				} catch (error: unknown) {
					errback(
						new Error(
							`Error while creating Producer: ${JSON.stringify(
								(error as any).data,
								undefined,
								'\t'
							)}`
						)
					);
				}
			});

			console.log('Step 5a: sendTransport', sendTransport);
			return sendTransport;
		}
	);

	// Step 6: Create a media track (set by a component in the template)
	const [stream, setStream] = createSignal<MediaStream | undefined>();

	const [producerAlreadyCreated, setSendTransportUsed] = createSignal(false);

	// Step 7: Create a producer
	const [producer] = createResource(
		() => ({
			sendTransport: sendTransport(),
			stream: stream(),
			producerAlreadyCreated: producerAlreadyCreated(),
		}),
		async ({sendTransport, stream, producerAlreadyCreated: sendTransportUsed}) => {
			if (!sendTransport || !stream) return;

			if (sendTransportUsed) {
				// TODO: Fix that this method is called multiple times with sendTransport and stream when i not check this producerAlreadyCreated check
				console.warn('Step 7: Producer already created');
				return;
			}

			const audioTrack = stream.getAudioTracks()[0];
			console.log('Step 7: audioTrack', audioTrack);

			if (!audioTrack) {
				console.error('Step 7: createProducer: No audioTrack available');
			}

			// Options for the producer are optional! :)
			const options = {
				track: audioTrack,
				// encodings: [{ssrc: 111111}],
				// codecOptions: {},
				// codec: {kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2},
			} satisfies ProducerOptions;

			const producer = await sendTransport.produce(options);
			setSendTransportUsed(true);

			console.log('Step 7: Finished producer', producer);
			return producer;
		}
	);

	// debug effect to force recomputation of resources
	createEffect(() => {
		// device();
		// clientUuid();
		// sendTransport();
		producer();
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
