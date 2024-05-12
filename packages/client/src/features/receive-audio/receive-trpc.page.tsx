import {createEffect, createResource, createSignal} from 'solid-js';
import {trpcClient} from '../../trpc/trpc-client';
import * as mediasoupClient from 'mediasoup-client';

export function ReceiveTrpcPage() {
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

	// Step 1: Load ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const response = await trpcClient.getServerRtpCapabilities.query();
		console.log('Step 1: serverRtpCapabilities', response);
		return response;
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
	const deviceRtpCapabilities = () => device()?.rtpCapabilities;

	// Step 5: Receive list of available producer ids
	const [producerIds] = createResource(async () => {
		const response = await trpcClient.getAvailableProducers.query();

		console.log('Step 5: Available Producers', response);
		// return response.filter((id: string) => id !== null);
		return response;
	});

	const [selectedProducerId, setSelectedProducerId] = createSignal<string>();
	createEffect(() => {
		const availableProducers = producerIds() ?? [];
		if (availableProducers.length > 0) {
			setSelectedProducerId(availableProducers[0]?.id);
		}
	});

	// Step 4: Create a transport for receiving audio
	const [receiveTransport] = createResource(
		() => ({
			device: device(),
			clientUuidAvailable: clientUuidAvailable(),
			// producerIds: producerIds(),
		}),
		async ({device, clientUuidAvailable}) => {
			if (!device || !clientUuidAvailable) return;

			const serverTransport = await trpcClient.createServerWebRtcTransport.mutate();
			if (!serverTransport) {
				console.error(
					`Server transport creation not successful - server returned undefined - probably error on server!`
				);
				return;
			}

			const receiveTransport = device.createRecvTransport(serverTransport.transportOptions);

			receiveTransport.on('connect', async ({dtlsParameters}, callback, errback) => {
				try {
					await trpcClient.connectWebRtcTransport.mutate({
						transportId: receiveTransport.id,
						dtlsParameters,
					});
					// go on with client side processing of webrtc (for example: creating producers, etc.)
					callback();
				} catch (error) {
					errback(
						new Error(
							`Error while sending DTLS parameters: ${JSON.stringify(error, undefined, '\t')}`
						)
					);
				}
			});

			return receiveTransport;
		}
	);

	// Step 5: Zwischenschritt - canConsume
	const [canConsume] = createResource(
		() => ({
			selectedProducerId: selectedProducerId(),
			deviceRtpCapabilities: deviceRtpCapabilities(),
		}),
		async ({selectedProducerId, deviceRtpCapabilities}) => {
			if (!selectedProducerId || !deviceRtpCapabilities) return;

			const response = await trpcClient.canDeviceConsumeProducer.query({
				selectedProducerId,
				deviceRtpCapabilities,
			});

			console.log('Step 5: canConsume', response);
			return response;
		}
	);

	// Step 6: Create a consumer for a selected producer
	const [consumer] = createResource(
		() => ({
			device: device(),
			receiveTransport: receiveTransport(),
			selectedProducerId: selectedProducerId(),
		}),
		async ({device, receiveTransport, selectedProducerId}) => {
			if (!device || !receiveTransport || !selectedProducerId) return;

			const serverConsumer = await trpcClient.createConsumer.mutate({
				transportId: receiveTransport.id,
				selectedProducerId: selectedProducerId,
				deviceRtpCapabilities: device.rtpCapabilities,
			});

			const deviceConsumer = await receiveTransport.consume(serverConsumer);

			console.log('Step 6: Consumer created', deviceConsumer);

			return deviceConsumer;
		}
	);

	const [audioStream] = createResource(
		() => ({
			consumer: consumer(),
		}),
		async ({consumer}) => {
			if (!consumer) return;

			const stream = new MediaStream();
			stream.addTrack(consumer.track);

			return stream;
		}
	);

	// Step 8 Render Audio Stream

	let audioElement!: HTMLAudioElement;
	createEffect(() => {
		const stream = audioStream();
		if (stream) {
			audioElement.srcObject = stream;
		}
	});

	return (
		<div>
			<h1>Receive Audio (with trpc + mediasoup)</h1>
			<fieldset>
				<legend>Available Producers</legend>
				<div style="display:flex; flex-flow: column nowrap; gap: 4px; padding: 0;">
					{producerIds()?.map(producer => (
						// <li style="border-bottom: 1px solid gray; padding: 4px;">
						<button style="" onclick={() => setSelectedProducerId(producer.id)}>
							{producer.id} - Kind: {producer.kind}
						</button>
					))}
				</div>
			</fieldset>

			<fieldset>
				<legend>Selected Producer</legend>
				<div>
					<p>Selected Producer: {selectedProducerId() ?? 'none'}</p>
					<p>
						{canConsume()
							? 'This device can consume the selected stream'
							: 'This device cannot consume the selected stream'}
					</p>
				</div>
			</fieldset>

			<fieldset>
				<legend>Player</legend>
				<audio controls ref={audioElement}></audio>
			</fieldset>
		</div>
	);
}
