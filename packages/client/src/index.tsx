/* @refresh reload */
import {render} from 'solid-js/web';
import {QueryClient, QueryClientProvider} from '@tanstack/solid-query';
import {SolidQueryDevtools} from '@tanstack/solid-query-devtools';
import {Route, Router} from '@solidjs/router';

import './index.css';
import App from './App';
import {ErrorPage404} from './features/pages/404.page';
import {SendPage} from './features/send-audio/send.page';
import {ReceivePage} from './features/receive-audio/receive.page';

const root = document.getElementById('root');
const queryClient = new QueryClient();

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?'
	);
}

render(
	() => (
		<QueryClientProvider client={queryClient}>
			<Router root={App}>
				<Route path="send" component={SendPage}></Route>
				<Route path="receive" component={ReceivePage}></Route>
				<Route path="*404" component={ErrorPage404} />
			</Router>

			<SolidQueryDevtools initialIsOpen={true} />
			{/* <Router>
					<Routes>
						<Route path="/" component={App} />
						<Route path="/sender" component={SenderPage} />
						<Route path="/consumer" component={ConsumerPage} />
					</Routes>
				</Router> */}
		</QueryClientProvider>
	),

	root!
);
