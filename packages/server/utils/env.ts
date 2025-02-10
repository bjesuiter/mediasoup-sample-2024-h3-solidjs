import {z} from 'zod';
import {myLanIP} from './ip.ts';

/**
 * Can be localhost and lan for now (2025-02-09)
 */
export const MODE = z
	.enum(['localhost', 'localhost.debug', 'lan'], {
		message: 'Invalid MODE: ${value}',
	})
	.parse(Deno.env.get('MODE'));

/**
 * The ip address that the mediasoup server will announce to the client
 * where the client could get the media from
 *
 * If MODE is 'lan', it will be the local ip address => Allows mobile to laptop communication - IF IP is correct!
 * If MODE is 'localhost', it will be 127.0.0.1 => Allows tab to tab communication
 */
export const ANNOUNCED_IP = MODE === 'lan' ? myLanIP : '127.0.0.1';
