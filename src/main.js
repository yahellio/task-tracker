import { config } from './config/index.js';
import { createContainer } from './container.js';
import { createApp } from './web/createApp.js';

const container = await createContainer(config);
const app = createApp(container);
const server = app.listen(config.port, config.host, () => {
  console.log(`Task tracker is running at http://${config.host}:${config.port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
