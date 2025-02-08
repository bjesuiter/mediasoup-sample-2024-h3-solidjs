import os from 'node:os';

const networkInterfaces = os.networkInterfaces();
const en0 = networkInterfaces['en0'];

if (!en0) {
	throw new Error('No en0 interface found for getting the local ip address!');
}

const en0IPv4 = en0.find(networkInterface => networkInterface.family === 'IPv4');

if (!en0IPv4 || !en0IPv4.address) {
	throw new Error('No IPv4 address found for the en0 interface!');
}
console.log(`Local IP address: ${en0IPv4.address}`);

export const myLanIP = en0IPv4.address;
