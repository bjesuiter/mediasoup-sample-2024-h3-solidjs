import {createEffect, createResource} from 'solid-js';
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
		}
	);

	createEffect(() => {
		serverRtpCapabilities();
		deviceRtpCapabilities();
		producerIds();
		receiveTransport();
	});

	return (
		<div>
			<h1>Receive Audio (with trpc + mediasoup)</h1>
			<fieldset>
				<legend>Available Producers</legend>
				<ul style="list-style: none; display:flex; flex-flow: column nowrap; gap: 4px; padding: 0;">
					{producerIds()?.map(producer => (
						// <li style="border-bottom: 1px solid gray; padding: 4px;">
						<li style="">
							{producer.producerServerId} - Kind: {producer.kind}
						</li>
					))}
				</ul>
			</fieldset>
		</div>
	);
}
