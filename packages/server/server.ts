import { expressApp } from "./express/express.app";

const expressPort = 4000;

expressApp.listen(expressPort);
console.info(`Express App listening on ${expressPort}`);
