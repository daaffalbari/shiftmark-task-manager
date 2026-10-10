import { createApp } from './app';
import { openDatabase } from './db/client';
import { migrateDatabase } from './db/migrate';
import { env } from './env';

const { db, sqlite } = openDatabase(env.DB_FILE_NAME);
migrateDatabase(db);
const server = createApp({
  db, origin: env.APP_ORIGIN, secureCookies: env.NODE_ENV === 'production', now: () => new Date(),
}).listen(env.PORT, () => console.log('API listening on http://localhost:' + env.PORT));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => { sqlite.close(); process.exit(0); }));
}
