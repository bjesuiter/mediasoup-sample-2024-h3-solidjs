import {For, createEffect, createResource, createSignal, on, type Component} from 'solid-js';
import * as mediasoupClient from 'mediasoup-client';
import {WSMessage, createWS, createWSState} from '@solid-primitives/websocket';
import {createStore} from 'solid-js/store';
import {BennyWebsocketEnvelope} from 'types';
import {ProducerOptions, TransportOptions} from 'mediasoup-client/lib/types';
import {AudioDeviceSelector} from './features/send-audio/AudioDeviceSelector';
import {server} from 'typescript';

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

	const [webRtcTransportOptions, setWebRtcTransportOptions] = createSignal<
		TransportOptions | undefined
	>();

	// ws message listener
	ws.addEventListener('message', ev => {
		if (ev.data === 'pong') {
			setWsMessages(wsMessages.length, ev.data);
			return;
		}

		const msg = JSON.parse(ev.data) as BennyWebsocketEnvelope;

		if (msg.command === 'WebRtcTransportOptions') {
			console.log('Step 4: WebRtcTransportOptions', msg.payload);
			setWebRtcTransportOptions(msg.payload);
		}

		if (msg.command === 'Error') {
			console.error('Error from server:', msg.payload);
		}
	});

	// ws.send('it works');
	// createEffect(on(ws., msg => console.log(msg), {defer: true}));

	// todo: refactor the createResource to use tanStackQuery
	// Step 1: Load ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const response = await fetch('http://localhost:3000/getServerRtpCapabilities');
		const responseObj = await response.json();
		console.log('Step 1: serverRtpCapabilities', responseObj);
		return responseObj;
	});
	const debugServerRtpCapabilities = () => JSON.stringify(serverRtpCapabilities(), null, 2);

	// Step 2 & 3
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

	// Step 4: Request & Receive webRtcTransportOptions (in Websocket handler at the top)
	ws.send(JSON.stringify({command: 'getWebRtcTransportOptions', payload: {}}));

	// Step 5: Create a sendTransport
	const [sendTransport] = createResource(
		() => ({
			device: device(),
			options: webRtcTransportOptions(),
		}),
		async ({device, options}) => {
			if (!device || !options) return;

			const sendTransport = device.createSendTransport(options);

			// Connect the transport lazily, when the first producer wants to send data
			sendTransport.on('connect', async ({dtlsParameters}, callback, errback) => {
				// Signal local DTLS parameters to the server side transport.
				try {
					const wsEnvelope = {
						command: 'connectWebRtcTransport',
						payload: {dtlsParameters, transportId: sendTransport.id},
					} satisfies BennyWebsocketEnvelope;

					ws.send(JSON.stringify(wsEnvelope));

					// TODO: only call callback when server received the message
					callback();
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
					const wsEnvelope = {
						command: 'newProducer',
						payload: {
							transportId: sendTransport.id,
							kind,
							rtpParameters,
							appData,
						},
					} satisfies BennyWebsocketEnvelope;

					ws.send(JSON.stringify(wsEnvelope));
				} catch (error: unknown) {
					errback(
						new Error(
							`Error while sending DTLS parameters: ${JSON.stringify(error, undefined, '\t')}`
						)
					);
				}
			});

			console.log('Step 5: sendTransport', sendTransport);
			return sendTransport;
		}
	);

	// Step 6: Create a media track
	const [stream, setStream] = createSignal<MediaStream | undefined>();

	// Step 7: Create a producer
	const [producer] = createResource(
		() => ({
			sendTransport: sendTransport(),
			stream: stream(),
		}),
		async ({sendTransport, stream}) => {
			if (!sendTransport) {
				console.error('Step 6: createProducer: No sendTransport available');
				return;
			}

			if (!stream) {
				console.error('Step 6: createProducer: No stream available');
				return;
			}

			const audioTrack = stream.getAudioTracks()[0];
			console.log('Step 6: audioTrack', audioTrack);
			// Options for the producer are optional! :)
			const options = {
				// TODO: get a MediaStreamTrack from a device, preferrably a mic
				track: audioTrack,
				// encodings: [{ssrc: 111111}],
				// codecOptions: {},
				// codec: {kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2},
			} satisfies ProducerOptions;

			const producer = await sendTransport.produce(options);

			console.log('Step 7: producer', producer);
			return producer;
		}
	);

	createEffect(() => {
		producer();
	});

	return (
		<div style="display: flex; flex-flow: column nowrap; gap: 24px; padding: 16px">
			<h1>SolidJS Test App for Mediasoup</h1>

			<fieldset>
				<legend>Infos</legend>
				<div style="display: flex; flex-flow: column nowrap; gap: 24px; padding: 16px">
					<span>WS Connection: {states[wsState()]}</span>
					<span>Stream: {stream()?.getAudioTracks()[0].label}</span>
				</div>
			</fieldset>

			<button onClick={() => ws.send('ping')}>Ping WS</button>

			<AudioDeviceSelector onDeviceSelected={stream => setStream(stream)} />

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
