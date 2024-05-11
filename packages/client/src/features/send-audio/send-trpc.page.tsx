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

	// Step 2 & 3: Create device and load serverRtpCapabilities into it
	const [device] = createResource(
		() => ({
			serverRtpCaps: serverRtpCapabilities(),
		}),
		async ({serverRtpCaps}) => {
			if (!serverRtpCaps) return;

			// Step 2: Create a device
			const device = new mediasoupClient.Device();

			//Step 3: Call device.load with serverRtpCapabilities
			await device.load({routerRtpCapabilities: serverRtpCaps});

			console.log('Step 2 & 3: device', device);

			return device;
		}
	);

	// debug effect to force recomputation of resources
	createEffect(() => {
		device();
	});

	return (
		<div>
			<h1>Send Audio (with trpc + mediasoup)</h1>
		</div>
	);
}
