import { createApp } from './app.js';
import { config } from './config.js';
import { database } from './database.js';

const server = createApp().listen(config.PORT, config.HOST, () => {
  console.log(`e-TUGIS API listening on http://${config.HOST}:${config.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));