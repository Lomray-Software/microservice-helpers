import type {
  IGatewayOptions,
  IGatewayParams,
  IMicroserviceOptions,
  IMicroserviceParams,
  ISocketOptions,
  ISocketParams,
} from '@lomray/microservice-nodejs-lib';
import { Gateway, Microservice, Socket } from '@lomray/microservice-nodejs-lib';
import type { IMiddlewareRepository } from '@lomray/microservice-remote-middleware';
import {
  RemoteMiddlewareClient,
  RemoteMiddlewareServer,
} from '@lomray/microservice-remote-middleware';
import type { ConnectionOptions } from 'typeorm';
import closeDbConnections from '@helpers/close-db-connections';
import CreateDbConnection from '@helpers/create-db-connection';
import Jobs from '@services/jobs';
import Log from '@services/log';
import type { ILokiTransportOptions } from '@services/log';
import RemoteConfig from '@services/remote-config';

type TRemoteMiddleware = { isEnable?: boolean } & (
  | { type: 'client'; msConfigName?: string }
  | { type: 'server'; getRepository: () => IMiddlewareRepository }
);

export interface IStartConfig {
  type: 'gateway' | 'microservice' | 'socket';
  msOptions: Partial<IGatewayOptions | IMicroserviceOptions | ISocketOptions>;
  msParams: Partial<IGatewayParams | IMicroserviceParams | ISocketParams>;
  registerMethods?: (ms: Microservice | Gateway | Socket) => Promise<void> | void;
  registerEvents?: (ms: Microservice | Gateway | Socket) => Promise<void> | void;
  registerJobs?: (jobService: Jobs) => Promise<void> | void;
  remoteMiddleware?: TRemoteMiddleware;
  remoteConfig?: { isDisable?: boolean; msConfigName?: string };
  logGrafana?: ILokiTransportOptions | boolean;
  logConsoleLevel?: string;
  hooks?: {
    beforeCreateMicroservice?: () => Promise<void> | void;
    afterCreateMicroservice?: (ms: Microservice | Gateway | Socket) => Promise<void> | void;
    afterInitRemoteMiddleware?: () => Promise<void> | void;
    beforeStart?: () => Promise<void> | void;
    onExit?: (reason: string, err?: unknown) => Promise<void> | void;
  };
}

export interface IStartConfigWithDb extends IStartConfig {
  dbOptions: ConnectionOptions;
  shouldUseDbRemoteOptions?: boolean;
}

export type IStartConfigSocket<T = IStartConfig | IStartConfigWithDb> = {
  registerRooms?: (ms: Socket) => Promise<void> | void;
} & T;

/**
 * Shutdown helper
 */
function setupProcessHandlers(
  shutdown: (reason: string, err?: unknown, exitCode?: number) => Promise<void>,
) {
  const off: (() => void)[] = [];

  const add = (
    ev: NodeJS.Signals | 'uncaughtException' | 'unhandledRejection',
    fn: (...a: any[]) => void,
  ) => {
    process.once(ev, fn);

    off.push(() => {
      process.off(ev, fn);
    });
  };

  add('SIGTERM', () => void shutdown('SIGTERM', undefined, 0));
  add('SIGINT', () => void shutdown('SIGINT', undefined, 0));
  add('uncaughtException', (err: Error) => void shutdown('uncaughtException', err, 1));
  add('unhandledRejection', (reason: unknown) => void shutdown('unhandledRejection', reason, 1));

  return () => off.forEach((fn) => fn());
}

/**
 * 1. Initialize
 * 2. Start microservice
 */
const start = async ({
  type,
  msOptions,
  msParams,
  registerMethods,
  registerEvents,
  registerJobs,
  remoteMiddleware,
  remoteConfig,
  logGrafana,
  logConsoleLevel,
  hooks: {
    beforeCreateMicroservice,
    afterCreateMicroservice,
    afterInitRemoteMiddleware,
    beforeStart,
    onExit,
  } = {},
}: IStartConfig): Promise<void> => {
  let isStopping = false;
  let disposeHandlers: (() => void) | undefined;

  /**
   * Graceful shutdown microservice
   */
  const shutdown = async (reason: string, err?: unknown, exitCode = 0): Promise<void> => {
    if (isStopping) {
      return;
    }

    isStopping = true;

    try {
      if (err) {
        Log.error(`[shutdown:${reason}]`, err);
      }

      await onExit?.(reason, err);
    } catch (e) {
      Log.error('Shutdown error:', e);
      exitCode = exitCode || 1;
    } finally {
      disposeHandlers?.();

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    }
  };

  try {
    Log.defaultMeta = {
      ...Log.defaultMeta,
      service: msOptions.name,
      msOptions,
      remoteMiddleware,
    };

    if (logConsoleLevel) {
      Log.setConsoleLogLevel(logConsoleLevel);
    }

    await beforeCreateMicroservice?.();

    const microservice = (
      type === 'gateway' ? Gateway : type === 'socket' ? Socket : Microservice
    ).create(msOptions, msParams);

    disposeHandlers = setupProcessHandlers(shutdown);

    // Enable remote config
    RemoteConfig.init(microservice, {
      msName: msOptions.name as string,
      msConfigName: remoteConfig?.msConfigName || 'configuration',
      isOffline: remoteConfig?.isDisable ?? false,
    });

    // Enable grafana loki transport
    if (logGrafana) {
      // Get options from environment or remote config
      const config =
        typeof logGrafana !== 'boolean'
          ? logGrafana
          : await RemoteConfig.get<ILokiTransportOptions>('grafana-loki', {
              isThrowNotExist: true,
              isCommon: true,
            });

      Log.enableLokiTransport(config);
    }

    await afterCreateMicroservice?.(microservice);
    await registerMethods?.(microservice);
    await registerEvents?.(microservice);
    await registerJobs?.(Jobs.init(microservice));

    // Enable remote middleware (enabled by default)
    if (remoteMiddleware?.isEnable ?? true) {
      // client by default
      if (remoteMiddleware?.type === 'client' || !remoteMiddleware?.type) {
        const rmMiddleware = RemoteMiddlewareClient.create(microservice, {
          logDriver: msParams.logDriver,
          configurationMsName: remoteMiddleware?.msConfigName ?? 'configuration',
        });

        await rmMiddleware.addRegisterEndpoint().obtainMiddlewares();
      } else {
        // server
        const rmMiddleware = RemoteMiddlewareServer.create(
          microservice,
          remoteMiddleware.getRepository(),
          {
            logDriver: msParams.logDriver,
          },
        );

        rmMiddleware.addRegisterEndpoint().addObtainEndpoint();
      }

      await afterInitRemoteMiddleware?.();
    }

    await beforeStart?.();
    await microservice.start();
  } catch (e) {
    Log.error('Failed to start microservice:', e);
    await shutdown('startup_error', e, 1);

    throw e;
  }
};

/**
 * Return start config with DB initialization
 */
const withDbConfig = ({
  dbOptions,
  shouldUseDbRemoteOptions = true,
  ...config
}: IStartConfigWithDb): IStartConfig => ({
  ...config,
  hooks: {
    ...(config.hooks ?? {}),
    afterCreateMicroservice: async (...hookParams) => {
      await CreateDbConnection(dbOptions, shouldUseDbRemoteOptions);
      await config?.hooks?.afterCreateMicroservice?.(...hookParams);
    },
    onExit: async (...hookParams) => {
      await closeDbConnections();
      await config?.hooks?.onExit?.(...hookParams);
    },
  },
});

/**
 * Return start config with register socket rooms
 */
const withSocketConfig = ({ registerRooms, ...config }: IStartConfigSocket): IStartConfig => ({
  ...config,
  hooks: {
    ...(config.hooks ?? {}),
    afterCreateMicroservice: async (...hookParams) => {
      await registerRooms?.(hookParams[0] as Socket);
      await config?.hooks?.afterCreateMicroservice?.(...hookParams);
    },
  },
});

/**
 * Choose launcher depends on params and run microservice
 */
const run = (params: IStartConfig | IStartConfigWithDb | IStartConfigSocket): Promise<void> => {
  let config = params;

  if (params.type === 'socket') {
    config = withSocketConfig(config);
  }

  if ('dbOptions' in config) {
    config = withDbConfig(config);
  }

  return start(config);
};

export { withDbConfig, withSocketConfig, start, run };
