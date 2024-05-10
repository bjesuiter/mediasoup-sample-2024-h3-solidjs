import {Component} from 'solid-js';

/**
 *
 * Workflow:
 * 1. We need a device to detect rtp capabilities:
 *  - https://www.youtube.com/watch?v=DOe7GkQgwPo&t=546s
 *  - https://mediasoup.org/documentation/v3/mediasoup-client/api/
 *
 *
 */

const App = (props: any) => {
	return (
		<div style="display: flex; flex-flow: column nowrap; gap: 24px; padding: 16px">
			<h1>SolidJS Test App for Mediasoup</h1>
			<nav style="display: flex; flex-flow: row nowrap; gap: 24px;">
				<a href="/send">Send Page</a>
				<a href="/receive">Receive Page</a>
			</nav>

			<div class="hr" />

			{props.children}
		</div>
	);
};

export default App;
