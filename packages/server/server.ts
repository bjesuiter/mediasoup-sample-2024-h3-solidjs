import { expressApp } from "./express/express.app";
import { logger } from "./utils/logger";

const expressPort = 4000;

expressApp.listen(expressPort);
logger.info(`Express App listening on ${expressPort}`);
