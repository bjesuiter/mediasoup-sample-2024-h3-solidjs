/* @refresh reload */
import {render} from 'solid-js/web';
import {QueryClient, QueryClientProvider} from '@tanstack/solid-query';
import {SolidQueryDevtools} from '@tanstack/solid-query-devtools';

import './index.css';
import App from './App';

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
			<App />
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
