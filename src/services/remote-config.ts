import type { AbstractMicroservice } from '@lomray/microservice-nodejs-lib';
import type { IJsonQuery } from '@lomray/microservices-types';
import { IsBoolean } from 'class-validator';
import { Endpoint, CRUD_EXCEPTION_CODE } from '@services/endpoint';

interface IRemoteConfigParams {
  msName: string;
  msConfigName: string;
  isOffline: boolean;
  resetCacheEndpoint?: string;
}

interface IRemoteConfigOptions<TParams> {
  isForce?: boolean;
  isThrowNotExist?: boolean;
  isCommon?: boolean;
  defaultValue?: TParams;
}

class RemoteConfigOutput {
  @IsBoolean()
  isReset: boolean;
}

/**
 * Get config from configuration microservice
 */
class RemoteConfig {
  /**
   * @type {RemoteConfig}
   * @protected
   */
  protected static instance: RemoteConfig;

  /**
   * @private
   */
  private readonly ms: AbstractMicroservice;

  /**
   * @private
   */
  private readonly params: IRemoteConfigParams;

  /**
   * Cached configs
   * @private
   */
  private configs: Record<string, any> = {};

  /**
   * @protected
   */
  protected constructor(ms: AbstractMicroservice, params: IRemoteConfigParams) {
    this.ms = ms;
    this.params = params;

    this.addResetCacheEndpoint();
  }

  /**
   * Init service instance
   */
  static init(ms: AbstractMicroservice, params: IRemoteConfigParams): void {
    if (!RemoteConfig.instance) {
      RemoteConfig.instance = new RemoteConfig(ms, params);
    }
  }

  /**
   * Get service instance
   */
  static getInstance(): RemoteConfig {
    if (!RemoteConfig.instance) {
      throw new Error('Remote config service should be instantiated before obtain config.');
    }

    return RemoteConfig.instance;
  }

  /**
   * Add endpoint for reset config cache
   * @private
   */
  private addResetCacheEndpoint(): void {
    const { resetCacheEndpoint = 'config-reset' } = this.params;

    this.ms.addEndpoint(
      resetCacheEndpoint,
      Endpoint.custom(
        () => ({ output: RemoteConfigOutput, description: 'Reset RemoteConfig cache' }),
        () => {
          this.configs = {};

          return { isReset: true };
        },
      ),
    );
  }

  /**
   * Get cached config synchronously
   */
  public static getCachedSync<TParams = Record<string, any> | undefined>(
    paramName: string,
  ): TParams | null {
    const self = RemoteConfig.getInstance();

    if (self.configs[paramName]) {
      return self.configs[paramName];
    }

    return null;
  }

  /**
   * Get remote config
   */
  public static async get<TParams = Record<string, any> | undefined>(
    paramName: string,
    options?: IRemoteConfigOptions<TParams>,
  ): Promise<TParams> {
    const {
      isForce = false,
      isThrowNotExist = false,
      isCommon = false,
      defaultValue,
    } = options ?? {};
    const self = RemoteConfig.getInstance();
    const cachedConfig = RemoteConfig.getCachedSync<TParams>(paramName);

    if (!isForce && cachedConfig !== null) {
      return cachedConfig;
    }

    let result;

    if (!self.params.isOffline) {
      const { msName, msConfigName } = self.params;

      const config = await self.ms.sendRequest<{ query: IJsonQuery }>(
        `${msConfigName}.config.view`,
        {
          query: {
            where: {
              type: paramName,
              or: [{ microservice: msName }, ...(isCommon ? [{ microservice: '*' }] : [])],
            },
          },
        },
        { isThrowError: false },
      );

      if (config.getError() && config.getError()?.code !== CRUD_EXCEPTION_CODE.ENTITY_NOT_FOUND) {
        throw config.getError();
      }

      result = config.getResult()?.entity?.params ?? defaultValue;
    } else {
      result = defaultValue;
    }

    if (!result && isThrowNotExist) {
      throw new Error(`Configuration for param "${paramName}" doesn't exist.`);
    }

    return (self.configs[paramName] = result);
  }
}

export default RemoteConfig;
