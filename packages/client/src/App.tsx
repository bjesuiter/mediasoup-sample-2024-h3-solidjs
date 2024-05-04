import {For, createEffect, createResource, on, type Component} from 'solid-js';
import * as mediasoupClient from 'mediasoup-client';
import {WSMessage, createWS, createWSState} from '@solid-primitives/websocket';
import {createStore} from 'solid-js/store';

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
	// Local SolidJS Preparation:
	const ws = createWS('ws://localhost:3000/_ws');
	const wsState = createWSState(ws);
	const states = ['Connecting', 'Connected', 'Disconnecting', 'Disconnected'];
	const [wsMessages, setWsMessages] = createStore<WSMessage[]>([]);
	ws.addEventListener('message', ev => setWsMessages(wsMessages.length, ev.data));

	// ws.send('it works');
	// createEffect(on(ws., msg => console.log(msg), {defer: true}));

	// Step 1: Load ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const response = await fetch('http://localhost:3000/getServerRtpCapabilities');
		const responseObj = response.json();
		console.log('serverRtpCapabilities', responseObj);
		return responseObj;
	});

	const [device] = createResource(serverRtpCapabilities, async () => {
		// Step 2: Create a device
		const device = new mediasoupClient.Device();

		//Step 3: Call device.load with serverRtpCapabilities
		await device.load({routerRtpCapabilities: serverRtpCapabilities()});

		console.log('device', device);

		return device;
	});

	const debugServerRtpCapabilities = () => JSON.stringify(serverRtpCapabilities(), null, 2);

	return (
		<div>
			<h1>SolidJS Test App for Mediasoup</h1>

			<p> WS Connection: {states[wsState()]}</p>

			<button onClick={() => ws.send('ping')}>Ping WS</button>

			{/* Debug Step 2 */}
			<ul>
				<For each={wsMessages}>{message => <li>{message.toString()}</li>}</For>
			</ul>

			{/* Debug Step 1 */}
			{/* <pre>{debugServerRtpCapabilities()}</pre> */}
		</div>
	);
};

export default App;
