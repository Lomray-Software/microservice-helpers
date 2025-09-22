import { getConnectionManager } from 'typeorm';
import Log from '@services/log';

/**
 * Close all DB connections
 */
const closeDbConnections = async (): Promise<void> => {
  try {
    const cm = getConnectionManager();

    if (!cm?.connections?.length) {
      return;
    }

    for (const conn of cm.connections) {
      try {
        const runners: any[] = (conn as any).queryRunners || [];

        for (const qr of runners) {
          try {
            await qr.release();
          } catch (e) {
            Log.warn(`QueryRunner release error on "${conn.name}":`, e);
          }
        }
      } catch {
        // ignore
      }
    }

    await Promise.all(
      cm.connections.map(async (conn) => {
        if (conn.isConnected) {
          try {
            await conn.close();
            Log.info(`DB connection "${conn.name}" closed`);
          } catch (e) {
            Log.warn(`DB connection "${conn.name}" close error:`, e);
          }
        }
      }),
    );
  } catch (e) {
    Log.error('Error while closing TypeORM connections:', e);
  }
};

export default closeDbConnections;
