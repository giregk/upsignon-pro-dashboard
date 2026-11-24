import env from './env';
import { db } from './db';
import https from 'https';
import fs from 'fs';
import { logError, logInfo } from './logger';
import { setupMSGraph } from './init_ms_graph';
import { setupGlobalAgent } from './xmlHttpRequest';

setupGlobalAgent();

// In dev, every request relies on DEV_FALLBACK_ADMIN_EMAIL to create a session. If this admin is
// missing in DB, no session is created and the front gets redirected to login.html, which is
// hard to diagnose (the front only sees "Unexpected token '<'"). So we exit at startup.
const checkDevFallbackAdmin = async (): Promise<void> => {
  if (env.IS_PRODUCTION) return;
  const email = env.DEV_FALLBACK_ADMIN_EMAIL;
  if (!email) {
    logError(
      '================ ERROR ================\n' +
        'DEV_FALLBACK_ADMIN_EMAIL is not set in back/.env. ',
    );
    process.exit(1);
  }
  try {
    const res = await db.query('SELECT 1 FROM admins WHERE email=$1', [email]);
    if (res.rows.length === 0) {
      logError(
        '================ ERROR ================\n' +
          `DEV_FALLBACK_ADMIN_EMAIL (${email}) not found in the admins table. ` +
          'Insert this admin in DB (see developerDoc.md).',
      );
      process.exit(1);
    }
  } catch (e) {
    logError('Could not check DEV_FALLBACK_ADMIN_EMAIL in DB', e);
  }
};

export const startServer = (app: any, then: any): void => {
  setupMSGraph();
  checkDevFallbackAdmin();
  if (env.LOCALHOST_SSL_CERTIFICATE_KEY_PATH && env.LOCALHOST_SSL_CERTIFICATE_CRT_PATH) {
    const options = {
      key: fs.readFileSync(env.LOCALHOST_SSL_CERTIFICATE_KEY_PATH),
      cert: fs.readFileSync(env.LOCALHOST_SSL_CERTIFICATE_CRT_PATH),
    };
    const server = https.createServer(options, app).listen(env.SERVER_PORT, () => {
      logInfo(
        `${env.IS_PRODUCTION ? 'Production' : 'Dev'} HTTPS server listening`,
        server.address(),
      );
      notifyPm2Ready();
      then();
    });
    listenForGracefulShutdown(server);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const server = app.listen(env.SERVER_PORT, () => {
      logInfo(
        `${env.IS_PRODUCTION ? 'Production' : 'Dev'} HTTP server listening`,
        server.address(),
      );
      notifyPm2Ready();
    });
    listenForGracefulShutdown(server);
  }
};

// Tell pm2 (wait_ready) that this process can take over traffic, so that it can stop the old one.
// process.send only exists when the process is spawned by pm2 with an IPC channel.
const notifyPm2Ready = () => {
  if (process.send) {
    process.send('ready');
  }
};

const listenForGracefulShutdown = (server: any) => {
  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    // stop accepting new connections, wait for in-flight requests to finish
    server.close(() => {
      logInfo('Graceful shutdown');
      db.gracefulShutdown().then(() => {
        process.exit();
      });
    });
    // drop idle keep-alive connections, otherwise close() would wait for them until kill_timeout
    server.closeIdleConnections?.();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
