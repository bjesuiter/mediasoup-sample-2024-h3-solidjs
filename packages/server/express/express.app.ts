import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import {createContext} from '../trpc/trpc.base.ts';
import {trpcRouter} from '../trpc/trpc.router.ts';
import {myLanIP} from '../utils/ip.ts';

export const expressApp = express();

expressApp.use(
	cors({
		origin: [
			'http://localhost:8000',
			'http://127.0.0.1:8000',
			'http://' + myLanIP + ':8000',
			'https://translate.tagungsapps.de',
		],
		credentials: true,
	})
);

// https://www.npmjs.com/package/express-session
expressApp.use(
	session({
		secret: 'my-secret',
		// only use cookies via https
		cookie: {secure: false},
		saveUninitialized: true,
		resave: false,
	})
);

expressApp.use('/ping', (req, res) => {
	res.send('pong');
});

expressApp.use(
	'/trpc',
	trpcExpress.createExpressMiddleware({
		router: trpcRouter,
		createContext,
	})
);
