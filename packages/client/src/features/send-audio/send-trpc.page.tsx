import {createEffect, createResource} from 'solid-js';
import {trpcClient} from '../../trpc/trpc-client';

export function SendTrpcPage() {
	// Step 1: Get ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const serverRtpCapabilities = await trpcClient.getServerRtpCapabilities.query();
		console.log('Step 1: serverRtpCapabilities', serverRtpCapabilities);
		return serverRtpCapabilities;
	});

	// debug effect to force recomputation of resources
	createEffect(() => {
		serverRtpCapabilities();
	});

	return (
		<div>
			<h1>Send Audio (with trpc + mediasoup)</h1>
		</div>
	);
}
