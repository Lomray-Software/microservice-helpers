export interface ICustomEnv {
  isBuild?: string | boolean;
  msNameDefault: string;
  packageName: string;
  version: string;
  withDb?: boolean;
  withAWS?: boolean;
  withFirebase?: boolean;
}

/**
 * Get common microservices constants
 * @constructor
 */
const GetConstants = ({
  msNameDefault,
  version,
  packageName,
  isBuild = false,
  withDb = false,
  withAWS = false,
  withFirebase = false,
}: ICustomEnv) => {
  const environment = process.env.NODE_ENV || 'development';

  return {
    IS_BUILD: isBuild,
    VERSION: version,
    PACKAGE_NAME: packageName,
    ENV: environment,
    IS_PROD: environment === 'production',
    IS_DEV: environment === 'development',
    IS_TEST: environment === 'tests',
    ENVIRONMENT: process.env.ENVIRONMENT || 'prod',
    SRC_FOLDER: isBuild ? 'lib' : 'src',
    MS_NAME: process.env.MS_NAME || msNameDefault,
    MS_CONFIG_NAME: process.env.MS_CONFIG_NAME || 'configuration',
    MS_CONNECTION: process.env.MS_CONNECTION,
    IS_CONNECTION_SRV: Boolean(process.env.MS_CONNECTION_SRV ?? false),
    MS_WORKERS: Number(process.env.MS_WORKERS || 5),
    IS_ENABLE_REMOTE_MIDDLEWARE: Boolean(Number(process.env.MS_ENABLE_REMOTE_MIDDLEWARE ?? 1)),
    IS_REMOTE_CONFIG_ENABLE: Boolean(Number(process.env.MS_REMOTE_CONFIG_ENABLE || 1)),
    IS_ENABLE_GRAFANA_LOG: Boolean(Number(process.env.MS_ENABLE_GRAFANA_LOG || 0)),
    MS_GRAFANA_LOKI_CONFIG: JSON.parse(process.env.MS_GRAFANA_LOKI_CONFIG || 'null'),
    IS_OPENTELEMETRY_ENABLE: Boolean(Number(process.env.MS_OPENTELEMETRY_ENABLE || 0)),
    IS_DISABLE_OPENTELEMETRY_TRACES: Boolean(
      Number(process.env.MS_DISABLE_OPENTELEMETRY_TRACES || 0),
    ),
    IS_DISABLE_OPENTELEMETRY_METRICS: Boolean(
      Number(process.env.MS_DISABLE_OPENTELEMETRY_METRICS || 0),
    ),
    MS_OPENTELEMETRY_OTLP_URL: process.env.MS_OPENTELEMETRY_OTLP_URL,
    IS_OPENTELEMETRY_OTLP_URL_SRV: Boolean(Number(process.env.MS_OPENTELEMETRY_OTLP_URL_SRV || 0)),
    IS_OPENTELEMETRY_DEBUG: Boolean(Number(process.env.MS_OPENTELEMETRY_DEBUG || 0)),
    MS_CONSOLE_LOG_LEVEL: process.env.MS_CONSOLE_LOG_LEVEL || 'info',
    IS_ENABLE_EVENTS: Boolean(Number(process.env.ENABLE_EVENTS || 0)),
    ...(withDb
      ? {
          DB: {
            URL: process.env.DB_URL,
            HOST: process.env.DB_HOST || '127.0.0.1',
            PORT: Number(process.env.DB_PORT) || 5432,
            USERNAME: process.env.DB_USERNAME || 'postgres',
            PASSWORD: process.env.DB_PASSWORD || 'example',
            DATABASE: process.env.DB_DATABASE || `ms-${process.env.MS_NAME || msNameDefault}`,
            IS_REJECT_UNAUTHORIZED: Boolean(Number(process.env.DB_REJECT_UNAUTHORIZED ?? 0)),
            IS_FROM_CONFIG_MS: Boolean(Number(process.env.DB_FROM_CONFIG_MS ?? 1)),
          },
        }
      : {}),
    ...(withAWS
      ? {
          AWS: {
            ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
            SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
            REGION: process.env.AWS_REGION || '',
            BUCKET_NAME: process.env.AWS_BUCKET_NAME || '',
            BUCKET_ACL: process.env.AWS_BUCKET_ACL || '',
            IS_FROM_CONFIG_MS: Boolean(Number(process.env.AWS_FROM_CONFIG_MS ?? 1)),
          },
        }
      : {}),
    ...(withFirebase
      ? {
          FIREBASE: {
            CREDENTIAL: JSON.parse(process.env.FIREBASE_CREDENTIAL || '{}'),
            IS_FROM_CONFIG_MS: Boolean(Number(process.env.FIREBASE_FROM_CONFIG_MS ?? 1)),
          },
        }
      : {}),
  };
};

export type ICommonConstants = ReturnType<typeof GetConstants>;

export type ICommonConstantsClean = Omit<ICommonConstants, 'AWS' | 'DB' | 'FIREBASE'>;

export type TOverloadReturn<T extends ICustomEnv> = ICommonConstantsClean &
  (T['withDb'] extends true ? Required<Pick<ICommonConstants, 'DB'>> : Record<never, never>) &
  (T['withAWS'] extends true ? Required<Pick<ICommonConstants, 'AWS'>> : Record<never, never>) &
  (T['withFirebase'] extends true
    ? Required<Pick<ICommonConstants, 'FIREBASE'>>
    : Record<never, never>);

export type IOverloadFunc = <T extends ICustomEnv>(params: T) => TOverloadReturn<T>;

export default GetConstants as IOverloadFunc;
