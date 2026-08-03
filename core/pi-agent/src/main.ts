import { loadRuntimeConfig } from "./config.js";
import { createPiRuntimeServer } from "./server.js";

const config = loadRuntimeConfig();
const server = createPiRuntimeServer(config);

await server.listen(config.port, "0.0.0.0");
console.log(`Pi agent runtime listening on port ${config.port}`);

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
