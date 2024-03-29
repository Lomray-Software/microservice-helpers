import fs from 'fs';
import { createConnection } from 'typeorm';
import type { ConnectionOptions } from 'typeorm';
import createDBIfNotExists from '@helpers/create-db';
import RemoteConfig from '@services/remote-config';

/**
 * Create database connection
 */
const createDbConnection = async (
  options: ConnectionOptions,
  shouldUseRemoteOptions: boolean,
): Promise<ReturnType<typeof createConnection>> => {
  let remoteDbOptions: ConnectionOptions | undefined;

  if (shouldUseRemoteOptions) {
    remoteDbOptions = await RemoteConfig.get<ConnectionOptions>('db', {
      isThrowNotExist: true,
      isCommon: true,
    });
  }

  const dbOptions = { ...options, ...remoteDbOptions } as ConnectionOptions;

  // Make typeorm config for cli commands
  fs.writeFileSync('ormconfig.json', JSON.stringify(dbOptions));
  await createDBIfNotExists(dbOptions);

  return createConnection(dbOptions);
};

export default createDbConnection;
