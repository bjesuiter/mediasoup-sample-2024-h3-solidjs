import {WSMessage, createWS, createWSState} from '@solid-primitives/websocket';
import {TransportOptions} from 'mediasoup-client/lib/types';
import {Component, createEffect, createResource, createSignal} from 'solid-js';
import {createStore} from 'solid-js/store';
import {BennyWebsocketEnvelope} from 'types';
import * as mediasoupClient from 'mediasoup-client';

type ConsumerListEntry = {
	consumerServerId?: string;
	consumerClientId: string;
	// the callback which needs to be called with the consumerServerId on arrival via ws
	callback?: (id: {id: string}) => void;
};

export const ReceivePage: Component = () => {
	// Local SolidJS Preparation:
	const ws = createWS('ws://localhost:3000/_ws');
	const wsState = createWSState(ws);
	const states = ['Connecting', 'Connected', 'Disconnecting', 'Disconnected'];
	const [wsMessages, setWsMessages] = createStore<WSMessage[]>([]);

	// used when server answers for a createConsumer request
	const [consumerList, setConsumerListEntry] = createStore<Array<ConsumerListEntry>>([]);

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

		if (msg.command === 'ServerSideConsumerCreated') {
			console.log('Step 7 answer: newConsumer', msg.payload);
			const consumer = consumerList.find(
				(entry: ConsumerListEntry) => entry.consumerClientId === msg.payload.consumerClientId
			);
			if (consumer?.callback) {
				consumer.callback({id: msg.payload.consumerServerId});
			}
		}
	});

	// Step 1: Load ServerRtpCapabilities
	const [serverRtpCapabilities] = createResource(async () => {
		const response = await fetch('http://localhost:3000/getServerRtpCapabilities');
		const responseObj = await response.json();
		console.log('Step 1: serverRtpCapabilities', responseObj);
		return responseObj;
	});
	const debugServerRtpCapabilities = () => JSON.stringify(serverRtpCapabilities(), null, 2);

	// Step 2 & 3 Create Device and call load with serverRtpCapabilities
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

	const deviceRtpCapabilities = () => device()?.rtpCapabilities;

	if (deviceRtpCapabilities === undefined) {
		console.error('deviceRtpCapabilities is undefined');
		return;
	}

	// Step 5: Receive list of available producer ids
	const [producerIds] = createResource(async () => {
		const response = await fetch('http://localhost:3000/producers');
		const responseObj = await response.json();
		console.log('Step 5: producerIds', responseObj);
		return responseObj.filter((id: string) => id !== null);
	});

	createEffect(() => {
		const producerId = producerIds()?.[0];

		if (!producerId) {
			console.info('No producerId available - waiting for arrival...');
			return;
		}

		// Step 5: Request new consumer
		// receive in Websocket handler at the top
		ws.send(
			JSON.stringify({
				command: 'newConsumer',
				payload: {
					producerId,
					deviceRtpCapabilities,
				},
			})
		);
	});

	return (
		<div>
			<h1>Receive Audio</h1>
			ProducerIds debug:
			<ul>
				{producerIds()?.map((id: string) => (
					<li>{id}</li>
				))}
			</ul>
		</div>
	);
};
