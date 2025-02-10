import {expressApp} from './express/express.app.ts';
import {ANNOUNCED_IP, MODE} from './utils/env.ts';
import {logger} from './utils/logger.ts';

const expressPort = 4000;

expressApp.listen(expressPort);
logger.info(`Express App listening on ${expressPort}`);
logger.info(`MODE: ${MODE}`);
logger.info(`Announced IP: ${ANNOUNCED_IP}`);
