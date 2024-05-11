import {createEffect, createResource} from 'solid-js';
import {trpcClient} from '../../trpc/trpc-client';
import * as mediasoupClient from 'mediasoup-client';

export function SendTrpcPage() {
	// Step 1: Get ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const serverRtpCapabilities = await trpcClient.getServerRtpCapabilities.query();
		console.log('Step 1: serverRtpCapabilities', serverRtpCapabilities);
		return serverRtpCapabilities;
	});

	// Step 2: Connect with the server which assigns a new uuid
	const [clientUuid] = createResource(async () => {
		const clientUuid = await trpcClient.connectClient.mutate();
		console.log('Step 2: Connected to server', {clientUuid});
		return clientUuid;
	});

	// Step 3 & 4: Create device and load serverRtpCapabilities into it
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

			console.log('Step 3 & 4: device', device);

			return device;
		}
	);

	// Step 5: Create a transport for sending audio
	const [sendTransport] = createResource(
		() => ({
			device: device(),
			clientUuid: clientUuid(),
		}),
		async ({device, clientUuid}) => {
			if (!device || !clientUuid) return;
			const serverTransport = await trpcClient.createServerWebRtcTransport.mutate({
				clientUuid: clientUuid,
			});

			if (!serverTransport) {
				console.error(`Server transport not created!`);
				return;
			}

			const sendTransport = device.createSendTransport(serverTransport.transportOptions);
			console.log('Step 5a: sendTransport', sendTransport);

			// Adding event listeners for 'connect' and 'produce'
			// Connects the transport lazily, when the first producer wants to send data
			sendTransport.on('connect', async ({dtlsParameters}, callback, errback) => {
				try {
					await trpcClient.connectWebRtcTransport.mutate({
						clientUuid,
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
		}
	);

	// debug effect to force recomputation of resources
	createEffect(() => {
		device();
		clientUuid();
		sendTransport();
	});

	return (
		<div>
			<h1>Send Audio (with trpc + mediasoup)</h1>
		</div>
	);
}
