import {createResource, type Component} from 'solid-js';
import * as mediasoupClient from 'mediasoup-client';

/**
 *
 * Workflow:
 * 1. We need a device to detect rtp capabilities:
 *  - https://www.youtube.com/watch?v=DOe7GkQgwPo&t=546s
 *  - https://mediasoup.org/documentation/v3/mediasoup-client/api/
 *
 *
 */

const App: Component = () => {
	// Step 1: Create a device
	const device = new mediasoupClient.Device();
	console.log('device', device);

	// Step 2: Load ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const response = await fetch('http://localhost:3000/getServerRtpCapabilities');
		return response.json();
	});

	const debugServerRtpCapabilities = () => JSON.stringify(serverRtpCapabilities(), null, 2);

	return (
		<div>
			<h1>SolidJS Test App for Mediasoup</h1>

			<pre>{debugServerRtpCapabilities()}</pre>
		</div>
	);
};

export default App;
