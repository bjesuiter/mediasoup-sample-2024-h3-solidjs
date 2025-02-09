import {expressApp} from './express/express.app.ts';
import {logger} from './utils/logger.ts';
import './utils/ip.ts';

const expressPort = 4000;

expressApp.listen(expressPort);
logger.info(`Express App listening on ${expressPort}`);
