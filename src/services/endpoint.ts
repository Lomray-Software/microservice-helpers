import * as crypto from 'crypto';
import type { IEndpointHandler } from '@lomray/microservice-nodejs-lib';
import { BaseException } from '@lomray/microservice-nodejs-lib';
import type { ObjectLiteral, IJsonQuery } from '@lomray/microservices-types';
import type { ITypeormJsonQueryOptions } from '@lomray/typeorm-json-query';
import TypeormJsonQuery from '@lomray/typeorm-json-query';
import { Type, plainToInstance } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsObject, validate } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
import { DeleteResult } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import type { Repository } from 'typeorm/repository/Repository';
import { IJsonQueryFilter } from '@entities/ijson-query-filter';
import IsUndefinable from '@validators/is-undefinable';

enum CRUD_EXCEPTION_CODE {
  VALIDATION_FAILED = -33481,
  MULTIPLE_INSERT_FORBIDDEN = -33482,
  FAILED_INSERT = -33483,
  FAILED_UPDATE = -33484,
  FAILED_DELETE = -33485,
  FAILED_RESTORE = -33486,
  ENTITY_NOT_FOUND = -33487,
  ENTITY_ALREADY_EXIST = -33488,
}

export type Constructable<TParams = any> = new (...args: any[]) => TParams;

export type EntityTarget<TEntity> =
  | Constructable<TEntity>
  | string
  | {
      type: TEntity;
      name: string;
    };

export type TEndpointHandlerParams<
  TParams = Record<string, any>,
  TPayload = Record<string, any>,
> = Parameters<IEndpointHandler<TParams, TPayload>>;

export type ICrudListHandler<
  TParams,
  TPayload,
  TResult,
  TEntity,
  TView = IListLazyResult<TEntity, TResult>,
> = (
  query: TypeormJsonQuery<TEntity>,
  params: TEndpointHandlerParams<TParams, TPayload>[0],
  options: TEndpointHandlerParams[1],
) => Promise<TView> | TView;

export type ICrudUpdateHandler<
  TParams,
  TPayload,
  TResult,
  TEntity,
  TView = IUpdateLazyResult<TEntity, TResult>,
> = (
  query: TypeormJsonQuery<TEntity>,
  fields: Partial<TEntity | TEntity[]>,
  params: TEndpointHandlerParams<TParams, TPayload>[0],
  options: TEndpointHandlerParams[1],
) => Promise<TView> | TView;

export type ICrudViewHandler<
  TParams,
  TPayload,
  TResult,
  TEntity,
  TView = IViewLazyResult<TEntity, TResult>,
> =
  | ((
      fields: Partial<TEntity | TEntity[]>,
      params: TEndpointHandlerParams<TParams, TPayload>[0],
      options: TEndpointHandlerParams[1],
    ) => Promise<TView> | TView)
  | null;

export type ICustomHandler<TParams, TResult, TPayload> = (
  params: TEndpointHandlerParams<TParams, TPayload>[0],
  options: TEndpointHandlerParams[1],
) => Promise<TResult> | TResult;

export type ITypeormRequestParams<TEntity, TPayload> = TPayload & {
  query?: IJsonQuery<TEntity>;
};

export type IRequestPayload<TEntity, TPayload> = TPayload & {
  authorization?: {
    filter?: {
      methodOptions?: {
        isAllowMultiple?: boolean;
        isSoftDelete?: boolean;
        isListWithCount?: boolean;
        isParallel?: boolean;
        shouldReturnEntity?: boolean;
        shouldResetCache?: boolean;
      };
      options?: Partial<ITypeormJsonQueryOptions>;
      query?: IJsonQuery<TEntity>;
    };
  };
};

class CountRequestParams<TEntity> {
  @IsObject()
  @IsUndefinable()
  @Type(() => IJsonQueryFilter)
  query?: IJsonQuery<TEntity>;

  @IsBoolean()
  @IsUndefinable()
  hasRemoved?: boolean;
}

class CountOutputParams {
  @IsNumber()
  count: number;
}

class ListRequestParams<TEntity> {
  @IsObject()
  @IsUndefinable()
  @Type(() => IJsonQueryFilter)
  query?: IJsonQuery<TEntity>;

  @IsBoolean()
  hasRemoved?: boolean;
}

class ListOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { list: [repository.metadata.name] });
  }

  @IsArray()
  list: TEntity[];

  @IsNumber()
  count?: number;
}

class ViewRequestParams<TEntity> {
  @IsObject()
  @Type(() => IJsonQueryFilter)
  query: IJsonQuery<TEntity>;
}

class ViewOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { entity: repository.metadata.name });
  }

  @IsObject()
  entity: TEntity;
}

class CreateRequestParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { fields: repository.metadata.name });
  }

  @JSONSchema({
    description: "It's can be array of entities fields (if enabled).",
    format: 'fields: { field: 1, field2: "demo" }',
  })
  @IsObject()
  fields: Partial<TEntity | TEntity[]>;
}

class CreateOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { entity: repository.metadata.name });
  }

  @IsObject()
  entity: TEntity;
}

class UpdateRequestParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { fields: repository.metadata.name });
  }

  @IsObject()
  fields: Partial<TEntity>;

  @IsObject()
  @Type(() => IJsonQueryFilter)
  query: IJsonQuery<TEntity>;
}

class UpdateOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { entity: repository.metadata.name });
  }

  @IsObject()
  entity: TEntity;
}

class RemoveRequestParams<TEntity> {
  @IsObject()
  @Type(() => IJsonQueryFilter)
  query: IJsonQuery<TEntity>;
}

class RemoveOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, {
      deleted: [repository.metadata.name],
      entities: [repository.metadata.name],
    });
  }

  @JSONSchema({
    description: "It's contains array of entities primary keys.",
  })
  @IsArray()
  deleted: Partial<TEntity>[];

  @JSONSchema({
    description: 'Return removed entities if "shouldReturnEntity" enabled',
  })
  @IsArray()
  @IsUndefinable()
  entities?: TEntity[];
}

class RestoreRequestParams<TEntity> {
  @IsObject()
  @Type(() => IJsonQueryFilter)
  query: IJsonQuery<TEntity>;
}

class RestoreOutputParams<TEntity> {
  constructor(repository: Repository<TEntity>) {
    // it will need for make documentation
    Object.assign(this, { restored: [repository.metadata.name] });
  }

  @IsArray()
  restored: TEntity[];
}

export type ICountLazyResult<TEntity, TResult> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | ({
      query?: TypeormJsonQuery<TEntity> | SelectQueryBuilder<TEntity>;
    } & TResult);

export type IListLazyResult<TEntity, TResult> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | ({
      query?: TypeormJsonQuery<TEntity> | SelectQueryBuilder<TEntity>;
    } & TResult);

export type IViewLazyResult<TEntity, TResult = never> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | ViewOutputParams<TEntity>
  | TResult;

export type ICreateLazyResult<TEntity, TResult = never> =
  | CreateOutputParams<TEntity | TEntity[]>
  | TResult;

export type IUpdateLazyResult<TEntity, TResult> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | {
      query?: TypeormJsonQuery<TEntity> | SelectQueryBuilder<TEntity>;
      fields?: Partial<TEntity>;
      result?: UpdateOutputParams<TEntity> | TResult;
    };

export type IRemoveLazyResult<TEntity> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | RemoveOutputParams<TEntity>;

export type IRestoreLazyResult<TEntity> =
  | TypeormJsonQuery<TEntity>
  | SelectQueryBuilder<TEntity>
  | RestoreOutputParams<TEntity>;

export type EndpointDescription = ((entityName?: string) => string) | string;

export interface ICrudParams<TEntity, TParams = ObjectLiteral, TResult = ObjectLiteral> {
  repository: Repository<TEntity>;
  queryOptions?: Partial<ITypeormJsonQueryOptions>;
  input?: EntityTarget<TParams> | TParams;
  output?: EntityTarget<TResult> | TResult;
  description?: EndpointDescription;
}

export interface ICountParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  cache?: number;
}

export interface IListParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  isListWithCount?: boolean; // return entities with count
  isParallel?: boolean; // run count and get entities parallel
  cache?: { listCache?: number; countCache?: number };
}

export interface IViewParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  cache?: number;
}

export interface ICreateParams<TEntity, TParams, TResult>
  extends Omit<ICrudParams<TEntity, TParams, TResult>, 'queryOptions'> {
  isAllowMultiple?: boolean;
  shouldResetCache?: boolean;
}

export interface IUpdateParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  shouldResetCache?: boolean;
}

export interface IRemoveParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  isAllowMultiple?: boolean;
  isSoftDelete?: boolean;
  shouldReturnEntity?: boolean;
  shouldResetCache?: boolean;
}

export interface IRestoreParams<TEntity, TParams, TResult>
  extends ICrudParams<TEntity, TParams, TResult> {
  isAllowMultiple?: boolean;
  shouldResetCache?: boolean;
}

export interface ICustomWithQueryParams<TEntity, TParams = ObjectLiteral, TResult = ObjectLiteral>
  extends ICrudParams<TEntity, TParams, TResult> {
  output: ICrudParams<TEntity, TParams, TResult>['output'];
}

export interface ICustomParams<TParams = ObjectLiteral, TResult = ObjectLiteral> {
  input?: ICrudParams<never, TParams, TResult>['input'];
  output: ICrudParams<never, TParams, TResult>['output'];
  description?: EndpointDescription;
}

export interface IReturn<TEntity, TParams, TPayload, TResult>
  extends IEndpointHandler<TParams, IRequestPayload<TEntity, TPayload>, TResult> {}

export interface IReturnWithMeta<TEntity, TParams, TPayload, TResult>
  extends IReturn<TEntity, TParams, TPayload, TResult> {
  getMeta: IWithEndpointMeta['getMeta'];
}

export type TOptions<THandlerOptions> = () => THandlerOptions;

export type TControllerMethodParam<TParams> =
  | boolean
  | {
      path?: string;
      options?: TOptions<Omit<TParams, 'repository'>>;
    };

export interface IControllerMethodsParams<TEntity> {
  count: TControllerMethodParam<
    ICountParams<TEntity, CountRequestParams<TEntity>, CountOutputParams>
  >;
  list: TControllerMethodParam<
    IListParams<TEntity, ListRequestParams<TEntity>, ListOutputParams<TEntity>>
  >;
  view: TControllerMethodParam<
    IViewParams<TEntity, ViewRequestParams<TEntity>, ViewOutputParams<TEntity>>
  >;
  create: TControllerMethodParam<
    ICreateParams<TEntity, CreateRequestParams<TEntity>, CreateOutputParams<TEntity>>
  >;
  update: TControllerMethodParam<
    IUpdateParams<TEntity, UpdateRequestParams<TEntity>, UpdateOutputParams<TEntity>>
  >;
  remove: TControllerMethodParam<
    IRemoveParams<TEntity, RemoveRequestParams<TEntity>, RemoveOutputParams<TEntity>>
  >;
  restore: TControllerMethodParam<
    IRestoreParams<TEntity, RestoreRequestParams<TEntity>, RestoreOutputParams<TEntity>>
  >;
}

export interface IControllerReturn<TEntity> {
  count: IReturnWithMeta<
    TEntity,
    CountRequestParams<TEntity>,
    Record<string, any>,
    CountOutputParams
  >;
  list: IReturnWithMeta<
    TEntity,
    ListRequestParams<TEntity>,
    Record<string, any>,
    ListOutputParams<TEntity>
  >;
  view: IReturnWithMeta<
    TEntity,
    ViewRequestParams<TEntity>,
    Record<string, any>,
    ViewOutputParams<TEntity>
  >;
  create: IReturnWithMeta<
    TEntity,
    CreateRequestParams<TEntity>,
    Record<string, any>,
    ICreateLazyResult<TEntity>
  >;
  update: IReturnWithMeta<
    TEntity,
    UpdateRequestParams<TEntity>,
    Record<string, any>,
    UpdateOutputParams<TEntity>
  >;
  remove: IReturnWithMeta<
    TEntity,
    RemoveRequestParams<TEntity>,
    Record<string, any>,
    RemoveOutputParams<TEntity>
  >;
  restore: IReturnWithMeta<
    TEntity,
    RestoreRequestParams<TEntity>,
    Record<string, any>,
    RestoreOutputParams<TEntity>
  >;
}

export interface IEndpointMeta<TInput = ObjectLiteral, TOutput = ObjectLiteral> {
  input?: string | ICrudParams<any, TInput, TOutput>['input'];
  output?: string | ICrudParams<any, TInput, TOutput>['output'];
  description?: EndpointDescription;
}

export interface IEndpointMetaDefault<TInput = ObjectLiteral, TOutput = ObjectLiteral> {
  input: IEndpointMeta<TInput, TOutput>['input'];
  output: IEndpointMeta<TInput, TOutput>['output'];
  description?: EndpointDescription;
}

export interface IWithEndpointMeta {
  getMeta: () => {
    input: [string | undefined, ObjectLiteral | undefined | null];
    output: [string | undefined, ObjectLiteral | undefined | null];
    description?: string;
  };
}

/**
 * Create typeorm query instance based on request
 */
const createTypeQuery = <TEntity, TParams, TPayload>(
  queryBuilder: SelectQueryBuilder<TEntity>,
  params: TEndpointHandlerParams<
    ITypeormRequestParams<TEntity, TParams>,
    IRequestPayload<TEntity, TPayload>
  >[0],
  options: Partial<ITypeormJsonQueryOptions> = {},
): TypeormJsonQuery<TEntity> =>
  TypeormJsonQuery.init<TEntity>(
    {
      queryBuilder,
      query: params.query,
      authQuery: params.payload?.authorization?.filter,
    },
    options,
  );

/**
 * Check if query has empty where condition
 */
const hasEmptyCondition = <TEntity>(query: SelectQueryBuilder<TEntity>): boolean => {
  const [condition] = TypeormJsonQuery.qbWhereParse(query);

  if (!condition) {
    return true;
  }

  // condition should contain at least one parameter or equal (number | string)
  return !/([a-z\s."]+)([!=<>]+|like|is|in)\s?(:|\(:|[0-9]|')/i.test(condition);
};

/**
 * Cache keys
 */
const CACHE_KEYS = {
  list: 'CRUD:list',
  count: 'CRUD:count',
  view: 'CRUD:view',
};

/**
 * Get query cache key
 */
const getCrudCacheKey = (
  query: SelectQueryBuilder<any>,
  prefix: string,
  { hasOnlyAlias = false, hasOnlyWhere = false } = {},
): string => {
  const cacheKey = `${prefix}:${query.alias}`;

  if (hasOnlyAlias) {
    return cacheKey;
  }

  const [rawQuery, params] = query.getQueryAndParameters();
  const queryParams = JSON.stringify(params);
  const expression = rawQuery.split('WHERE ')[1] ?? '';
  const condition = expression?.split(/\s(limit|order|group|having)/i)?.[0] ?? '';

  if (hasOnlyWhere) {
    return `${cacheKey}:${crypto
      .createHash('md5')
      .update(`${condition}.${queryParams}`)
      .digest('hex')}`;
  }

  return `${cacheKey}:${crypto
    .createHash('md5')
    .update(`${expression}.${queryParams}`)
    .digest('hex')}`;
};

/**
 * Reset cache
 */
const resetCache = (repository: Repository<any>, keys: string[] = []): Promise<DeleteResult> => {
  const cacheTable: string =
    repository.manager.connection?.queryResultCache?.['queryResultCacheTable'] ??
    'query-result-cache';
  const query = repository.createQueryBuilder();
  const qb = repository.manager.createQueryBuilder().delete().from(cacheTable);

  keys.forEach((key, i) => {
    const identifier = getCrudCacheKey(query, key, { hasOnlyAlias: true });

    qb.orWhere(`${qb.escape('identifier')} LIKE :identifier${i}`, {
      [`identifier${i}`]: `${identifier}:%`,
    });
  });

  return qb.execute();
};

/**
 * Default method handler
 */
const defaultHandler = <TEntity>(query: TypeormJsonQuery<TEntity>): TypeormJsonQuery<TEntity> =>
  query;

/**
 * Execute SelectQueryBuilder
 */
const getQueryCount = async <TEntity>(
  query: SelectQueryBuilder<TEntity>,
  { hasRemoved = false, cache = 0 } = {},
): Promise<CountOutputParams> => {
  if (hasRemoved) {
    query.withDeleted();
  }

  if (cache) {
    query.cache(getCrudCacheKey(query, CACHE_KEYS.count, { hasOnlyWhere: true }), cache);
  }

  return {
    count: await query.getCount(),
  };
};

/**
 * Execute SelectQueryBuilder
 */
const getQueryList = async <TEntity>(
  query: SelectQueryBuilder<TEntity>,
  {
    isWithCount = true,
    hasRemoved = false,
    isParallel = false,
    cache: { listCache = 0, countCache = 0 } = {},
  } = {},
): Promise<ListOutputParams<TEntity>> => {
  if (hasRemoved) {
    query.withDeleted();
  }

  if (listCache) {
    query.cache(getCrudCacheKey(query, CACHE_KEYS.list), listCache);
  }

  if (!isWithCount) {
    return { list: await query.getMany() };
  }

  let list, count;

  if (!isParallel) {
    [list, count] = await query.getManyAndCount();
  } else {
    const countQuery = query.clone();

    if (countCache) {
      countQuery.cache(
        getCrudCacheKey(query, CACHE_KEYS.count, { hasOnlyWhere: true }),
        countCache,
      );
    }

    [list, count] = await Promise.all([query.getMany(), countQuery.getCount()]);
  }

  return {
    list,
    count,
  };
};

/**
 * Default handler for create entity(ies)
 */
const createDefaultHandler = async <TEntity, TResult = never>({
  fields,
  repository,
  isAllowMultiple = false,
  shouldResetCache = false,
}: {
  fields: CreateRequestParams<TEntity>['fields'];
  repository: ICrudParams<TEntity>['repository'];
  isAllowMultiple?: boolean;
  shouldResetCache?: boolean;
}): Promise<ICreateLazyResult<TEntity, TResult>> => {
  const isArray = Array.isArray(fields);
  const entitiesAttributes = isArray ? fields : [fields];

  if (!isAllowMultiple && entitiesAttributes.length > 1) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.MULTIPLE_INSERT_FORBIDDEN,
      status: 422,
      message: 'You can create only one entity at a time.',
    });
  }

  const entities: (TEntity & Partial<TEntity>)[] = entitiesAttributes.map((attributes) =>
    plainToInstance(repository.target as Constructable<TEntity>, attributes ?? {}),
  );
  const errors = await Promise.all(
    entities.map((entity) =>
      validate(entity, {
        whitelist: true,
        forbidNonWhitelisted: true,
        groups: ['create', repository.metadata.name],
        always: true,
        validationError: { target: false },
      }),
    ),
  );

  if (errors.some((entityErrors) => entityErrors.length > 0)) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Validation failed for one or more entities.',
      payload: isArray ? errors : errors[0],
    });
  }

  /**
   * Is entity contain composite primary key
   */
  if (repository.metadata.primaryColumns.length > 1) {
    const primaryKeys = entities.map((entity) => repository.metadata.getEntityIdMap(entity));

    /**
     * If provided duplicated entity
     */
    if ((await repository.createQueryBuilder('entity').where(primaryKeys).getCount()) !== 0) {
      throw new BaseException({
        code: CRUD_EXCEPTION_CODE.ENTITY_ALREADY_EXIST,
        status: 409,
        message: 'One or more entities already exist.',
      });
    }
  }

  try {
    const result = await repository.save(entities, { chunk: 20 });

    if (shouldResetCache) {
      void resetCache(repository, [CACHE_KEYS.list, CACHE_KEYS.count, CACHE_KEYS.view]);
    }

    return { entity: isArray ? result : result[0] };
  } catch (e) {
    const { detail } = e;
    let { message } = e;
    let payload;

    if (message.includes('duplicate key')) {
      payload = { original: message, detail };
      message = 'This entity already exists.';
    }

    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.FAILED_INSERT,
      status: 500,
      message,
      payload,
    });
  }
};

/**
 * Default handler for view entity
 */
const viewDefaultHandler = async <TEntity>(
  query: SelectQueryBuilder<TEntity>,
  { cache = 0 } = {},
): Promise<ViewOutputParams<TEntity>> => {
  if (hasEmptyCondition(query)) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Entity view condition is empty.',
    });
  }

  if (cache) {
    query.cache(getCrudCacheKey(query, CACHE_KEYS.view), cache);
  }

  const targets = await query.take(2).getMany();

  // catch attempting view multiple entities or nothing
  if (targets.length > 1) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Entity condition invalid.',
      payload: { count: targets.length },
    });
  }

  if (targets.length === 0) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.ENTITY_NOT_FOUND,
      status: 404,
      message: 'Entity not found.',
    });
  }

  return { entity: targets[0] };
};

/**
 * Default handler for update entity
 *
 * fields - should be without primary keys (e.g. this is done in CRUD.update)
 */
const updateDefaultHandler = async <TEntity>(
  query: SelectQueryBuilder<TEntity>,
  fields: Partial<TEntity>,
  repository: ICrudParams<TEntity>['repository'],
  shouldResetCache = false,
): Promise<UpdateOutputParams<TEntity>> => {
  // catch attempting pass empty fields for update
  if (Object.keys(fields).length === 0) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Validation failed for entity, empty fields.',
    });
  }

  const { entity } = await viewDefaultHandler(query);
  const result: TEntity & Partial<TEntity> = plainToInstance(
    repository.target as Constructable<TEntity>,
    {
      ...entity,
      ...fields,
    },
  );
  const errors = await validate(result, {
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: ['update', repository.metadata.name],
    always: true,
    validationError: { target: false },
  });

  if (errors.length > 0) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Validation failed for entity, invalid fields.',
      payload: errors,
    });
  }

  try {
    const updatedEntity = await repository.save(result);

    if (shouldResetCache) {
      void resetCache(repository, [CACHE_KEYS.list, CACHE_KEYS.view]);
    }

    return { entity: updatedEntity };
  } catch (e) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.FAILED_UPDATE,
      status: 500,
      message: e.message,
    });
  }
};

/**
 * Default handler for remove entity(ies)
 */
const removeDefaultHandler = async <TEntity>(
  repository: ICrudParams<TEntity>['repository'],
  query: SelectQueryBuilder<TEntity>,
  {
    isAllowMultiple = false,
    isSoftDelete = false,
    shouldReturnEntity = false,
    shouldResetCache = false,
  }: Pick<
    IRemoveParams<TEntity, never, never>,
    'isSoftDelete' | 'isAllowMultiple' | 'shouldReturnEntity' | 'shouldResetCache'
  > = {},
): Promise<RemoveOutputParams<TEntity>> => {
  if (hasEmptyCondition(query)) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Entity remove condition is empty.',
    });
  }

  const primaryKeys = new Set(
    repository.metadata.primaryColumns.map(({ propertyName }) => propertyName),
  );

  try {
    const entities = await query.getMany();

    if (entities.length === 0) {
      throw new BaseException({
        code: CRUD_EXCEPTION_CODE.ENTITY_NOT_FOUND,
        status: 404,
        message: 'Entity not found.',
      });
    }

    if (!isAllowMultiple && entities.length > 1) {
      throw new BaseException({
        code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
        status: 422,
        message: 'You can remove only one entity at a time.',
      });
    }

    // keep only primary keys
    const deleted = entities.map((entity) =>
      Object.entries(entity).reduce((res, [field, value]) => {
        if (!primaryKeys.has(field)) {
          return res;
        }

        return {
          ...res,
          [field]: value,
        };
      }, {}),
    );

    if (isSoftDelete) {
      await repository.softRemove(entities);
    } else {
      await repository.remove(entities);
    }

    if (shouldResetCache) {
      void resetCache(repository, [CACHE_KEYS.list, CACHE_KEYS.count, CACHE_KEYS.view]);
    }

    return { deleted, ...(shouldReturnEntity ? { entities } : {}) };
  } catch (e) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.FAILED_DELETE,
      status: 500,
      message: e.message,
    });
  }
};

/**
 * Default handler for restore entity(ies)
 */
const restoreDefaultHandler = async <TEntity>(
  repository: ICrudParams<TEntity>['repository'],
  query: SelectQueryBuilder<TEntity>,
  { isAllowMultiple = false, shouldResetCache = false } = {},
): Promise<RestoreOutputParams<TEntity>> => {
  if (hasEmptyCondition(query)) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
      status: 422,
      message: 'Entity restore condition is empty.',
    });
  }

  try {
    const entities = await query.getMany();

    if (entities.length === 0) {
      throw new BaseException({
        code: CRUD_EXCEPTION_CODE.ENTITY_NOT_FOUND,
        status: 404,
        message: 'Entity not found for restore.',
      });
    }

    if (!isAllowMultiple && entities.length > 1) {
      throw new BaseException({
        code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
        status: 422,
        message: 'You can restore only one entity at a time.',
      });
    }

    const restored = await repository.recover(entities);

    if (shouldResetCache) {
      void resetCache(repository, [CACHE_KEYS.list, CACHE_KEYS.count, CACHE_KEYS.view]);
    }

    return { restored };
  } catch (e) {
    throw new BaseException({
      code: CRUD_EXCEPTION_CODE.FAILED_RESTORE,
      status: 500,
      message: e.message,
    });
  }
};

interface IParamsConstructor {
  new (repository: any): ObjectLiteral;
}

/**
 * Add endpoint metadata (in,out attributes) for generate doc or authorization ms data
 */
const withMeta = <TFunc>(
  handler: TFunc,
  getOptions: TOptions<{ repository?: Repository<any> } & IEndpointMeta>,
  defaults?: IEndpointMetaDefault<IParamsConstructor, IParamsConstructor | null>,
): TFunc & IWithEndpointMeta =>
  Object.assign(handler, {
    /**
     * If default input/output - get class name & class params
     * If custom input/output - get class name
     *
     * Default: [ClassName, { fields: repository.target }] - this helps understand relations
     * Custom: [ClassName, null] - make doc automatically because it's custom defined class
     *
     * Example:
     * List endpoint:
     *  - Input: [ListRequestParams, null]
     *  - Output: [ListOutputParams, { list: [EntityClassName] }]
     * Create endpoint:
     *  - Input: [CreateRequestParams, { fields: EntityClassName }]
     *  - Output: [EntityClassName, null]
     */
    getMeta: () => {
      const { repository, description, input, output } = Object.assign(getOptions(), defaults);
      const inputParams =
        typeof input === 'function' && input === defaults?.input
          ? new input(repository)
          : undefined;
      const outputParams =
        typeof output === 'function' && output === defaults?.output
          ? new output(repository)
          : undefined;

      const resInput: ReturnType<IWithEndpointMeta['getMeta']>['input'] = [
        typeof input === 'string' ? input : input?.name,
        inputParams,
      ];
      const resOutput: ReturnType<IWithEndpointMeta['getMeta']>['output'] = [
        // If output.name not exist - try to set repository target class name
        typeof output === 'string' ? output : output?.name ?? repository?.metadata.name,
        outputParams,
      ];

      return {
        input: resInput,
        output: resOutput,
        description:
          typeof description === 'function' ? description(repository?.metadata.name) : description,
      };
    },
  });

/**
 * Class with helpers for create endpoint handlers
 * It's provide easily manage endpoints meta, validation params etc.
 */
class Endpoint {
  static defaultHandler = {
    count: getQueryCount,
    list: getQueryList,
    view: viewDefaultHandler,
    create: createDefaultHandler,
    update: updateDefaultHandler,
    remove: removeDefaultHandler,
    restore: restoreDefaultHandler,
  };

  static defaultParams = {
    count: {
      input: CountRequestParams,
      output: CountOutputParams,
      description: (name = 'entities'): string => `Returns count of ${name} by given condition`,
    },
    list: {
      input: ListRequestParams,
      output: ListOutputParams,
      description: (name = 'entities'): string => `Returns list of ${name} by given condition`,
    },
    view: {
      input: ViewRequestParams,
      output: ViewOutputParams,
      description: (name = 'entity'): string => `Returns ${name} by given condition`,
    },
    create: {
      input: CreateRequestParams,
      output: CreateOutputParams,
      description: (name = 'entity'): string => `Create a new ${name}`,
    },
    update: {
      input: UpdateRequestParams,
      output: UpdateOutputParams,
      description: (name = 'entity'): string => `Update ${name} by given condition`,
    },
    remove: {
      input: RemoveRequestParams,
      output: RemoveOutputParams,
      description: (name = 'entity'): string => `Remove ${name} by given condition`,
    },
    restore: {
      input: RestoreRequestParams,
      output: RestoreOutputParams,
      description: (name = 'entity'): string => `Restore ${name} by given condition`,
    },
  };

  /**
   * Create CRUD endpoints (controller) for given entity
   */
  static controller<TEntity>(
    repository: () => Repository<TEntity>,
    methods: Partial<IControllerMethodsParams<TEntity>> = {},
  ): Partial<IControllerReturn<TEntity>> {
    return Object.keys(this.defaultHandler).reduce((res, endpoint) => {
      const method = methods[endpoint];
      const { path = endpoint, options = undefined } = typeof method === 'object' ? method : {};

      return {
        ...res,
        ...(method !== false
          ? {
              [path]: Endpoint[endpoint](() => ({
                repository: repository(),
                ...options?.(),
              })),
            }
          : {}),
      };
    }, {});
  }

  /**
   * Count operation
   */
  static count<
    TParams extends CountRequestParams<TEntity>,
    TResult extends CountOutputParams,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    countOptions: TOptions<ICountParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<
      TParams,
      TPayload,
      TResult,
      TEntity,
      ICountLazyResult<TEntity, TResult>
    > = defaultHandler,
  ): IReturnWithMeta<
    TEntity,
    CountRequestParams<TEntity> | TParams,
    TPayload,
    CountOutputParams | TResult
  > {
    const countHandler: IReturn<TEntity, TParams, TPayload, CountOutputParams | TResult> =
      async function (params, options) {
        const { repository, queryOptions, cache } = countOptions();
        const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, {
          relationOptions: ['*'],
          isDisableOrderBy: true,
          isDisableAttributes: true,
          ...queryOptions,
        });
        const result = await handler(typeQuery, params, options);
        const { hasRemoved } = params;
        const defaultParams = { hasRemoved, cache };

        if (result instanceof TypeormJsonQuery) {
          return Endpoint.defaultHandler.count(result.toQuery(), defaultParams);
        }

        if (result instanceof SelectQueryBuilder) {
          return Endpoint.defaultHandler.count(result, defaultParams);
        }

        const { query, count, ...payload } = result;

        if (query instanceof TypeormJsonQuery) {
          return {
            ...(await Endpoint.defaultHandler.count(query.toQuery(), defaultParams)),
            ...payload,
          };
        }

        if (query instanceof SelectQueryBuilder) {
          return { ...(await Endpoint.defaultHandler.count(query, defaultParams)), ...payload };
        }

        return { count, ...payload };
      };

    return withMeta(countHandler, countOptions, Endpoint.defaultParams.count);
  }

  /**
   * List operation
   */
  static list<
    TParams extends ListRequestParams<TEntity>,
    TResult extends ListOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    listOptions: TOptions<IListParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<TParams, TPayload, TResult, TEntity> = defaultHandler,
  ): IReturnWithMeta<TEntity, TParams, TPayload, ListOutputParams<TEntity> | TResult> {
    const listHandler: IReturn<TEntity, TParams, TPayload, ListOutputParams<TEntity> | TResult> =
      async function (params, options) {
        const { repository, queryOptions, isListWithCount, isParallel, cache } = {
          ...listOptions(),
          ...(params.payload?.authorization?.filter?.methodOptions ?? {}),
        };
        const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, queryOptions);
        const result = await handler(typeQuery, params, options);
        const { hasRemoved } = params;
        const defaultParams = { isWithCount: isListWithCount, hasRemoved, isParallel, cache };

        if (result instanceof TypeormJsonQuery) {
          return Endpoint.defaultHandler.list(result.toQuery(), defaultParams);
        }

        if (result instanceof SelectQueryBuilder) {
          return Endpoint.defaultHandler.list(result, defaultParams);
        }

        const { query, ...payload } = result;

        if (query instanceof TypeormJsonQuery) {
          return {
            ...(await Endpoint.defaultHandler.list(query.toQuery(), defaultParams)),
            ...payload,
          };
        }

        if (query instanceof SelectQueryBuilder) {
          return {
            ...(await Endpoint.defaultHandler.list(query, defaultParams)),
            ...payload,
          };
        }

        // responsibility on the developer (custom handler realisation)
        return { ...payload };
      };

    return withMeta(listHandler, listOptions, Endpoint.defaultParams.list);
  }

  /**
   * View operation
   */
  static view<
    TParams extends ViewRequestParams<TEntity>,
    TResult extends ViewOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    viewOptions: TOptions<IViewParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<
      TParams,
      TPayload,
      TResult,
      TEntity,
      IViewLazyResult<TEntity, TResult>
    > = defaultHandler,
  ): IReturnWithMeta<TEntity, TParams, TPayload, ViewOutputParams<TEntity> | TResult> {
    const viewHandler: IReturn<TEntity, TParams, TPayload, ViewOutputParams<TEntity> | TResult> =
      async function (params, options) {
        const { repository, queryOptions, cache } = viewOptions();
        const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, {
          isDisableOrderBy: true,
          isDisablePagination: true,
          ...queryOptions,
        });
        const result = await handler(typeQuery, params, options);

        if (result instanceof TypeormJsonQuery) {
          return Endpoint.defaultHandler.view(result.toQuery(), { cache });
        }

        if (result instanceof SelectQueryBuilder) {
          return Endpoint.defaultHandler.view(result, { cache });
        }

        return result;
      };

    return withMeta(viewHandler, viewOptions, Endpoint.defaultParams.view);
  }

  /**
   * Create operation
   */
  static create<
    TParams extends CreateRequestParams<TEntity>,
    TResult extends CreateOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    createOptions: TOptions<ICreateParams<TEntity, TParams, TResult>>,
    handler: ICrudViewHandler<
      TParams,
      TPayload,
      TResult,
      TEntity,
      ICreateLazyResult<TEntity, TResult>
    > = null,
  ): IReturnWithMeta<TEntity, TParams, TPayload, ICreateLazyResult<TEntity, TResult>> {
    const createHandler: IReturn<
      TEntity,
      TParams,
      TPayload,
      ICreateLazyResult<TEntity, TResult>
    > = (params, options) => {
      const { repository, isAllowMultiple, shouldResetCache } = {
        ...createOptions(),
        ...(params.payload?.authorization?.filter?.methodOptions ?? {}),
      };
      const { fields } = params ?? {};

      if (handler) {
        return handler(fields, params, options);
      }

      return this.defaultHandler.create({ fields, repository, isAllowMultiple, shouldResetCache });
    };

    return withMeta(createHandler, createOptions, Endpoint.defaultParams.create);
  }

  /**
   * Update operation
   */
  static update<
    TParams extends UpdateRequestParams<TEntity>,
    TResult extends UpdateOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    updateOptions: TOptions<IUpdateParams<TEntity, TParams, TResult>>,
    handler: ICrudUpdateHandler<TParams, TPayload, TResult, TEntity> = defaultHandler,
  ): IReturnWithMeta<TEntity, TParams, TPayload, UpdateOutputParams<TEntity> | TResult> {
    const updateHandler: IReturn<
      TEntity,
      TParams,
      TPayload,
      UpdateOutputParams<TEntity> | TResult
    > = async function (params, options) {
      const { repository, queryOptions, shouldResetCache } = {
        ...updateOptions(),
        ...(params.payload?.authorization?.filter?.methodOptions ?? {}),
      };
      const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, {
        relationOptions: ['*'],
        isDisableOrderBy: true,
        isDisablePagination: true,
        isDisableAttributes: true,
        ...queryOptions,
      });
      const primaryKeys = new Set(
        repository.metadata.primaryColumns.map(({ propertyName }) => propertyName),
      );
      const fields = Object.entries(params.fields ?? {}).reduce((res, [field, value]) => {
        // exclude primary fields from request
        if (primaryKeys.has(field)) {
          return res;
        }

        return {
          ...res,
          [field]: value,
        };
      }, {});
      const result = await handler(typeQuery, fields, params, options);

      if (!result) {
        throw new BaseException({
          code: CRUD_EXCEPTION_CODE.FAILED_INSERT,
          status: 500,
          message: 'Failed to update entity: no entity found within the given criteria.',
        });
      }

      if (result instanceof TypeormJsonQuery) {
        return Endpoint.defaultHandler.update(
          result.toQuery(),
          fields,
          repository,
          shouldResetCache,
        );
      }

      if (result instanceof SelectQueryBuilder) {
        return Endpoint.defaultHandler.update(result, fields, repository, shouldResetCache);
      }

      const { query, fields: updatedFields, result: entity } = result;

      if (query instanceof TypeormJsonQuery) {
        return Endpoint.defaultHandler.update(
          query.toQuery(),
          updatedFields ?? fields,
          repository,
          shouldResetCache,
        );
      }

      if (query instanceof SelectQueryBuilder) {
        return Endpoint.defaultHandler.update(
          query,
          updatedFields ?? fields,
          repository,
          shouldResetCache,
        );
      }

      return entity;
    };

    return withMeta(updateHandler, updateOptions, Endpoint.defaultParams.update);
  }

  /**
   * Delete operation
   */
  static remove<
    TParams extends RemoveRequestParams<TEntity>,
    TResult extends RemoveOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    removeOptions: TOptions<IRemoveParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<
      TParams,
      TPayload,
      TResult,
      TEntity,
      IRemoveLazyResult<TEntity>
    > = defaultHandler,
  ): IReturnWithMeta<TEntity, TParams, TPayload, RemoveOutputParams<TEntity> | TResult> {
    const removeHandler: IReturn<
      TEntity,
      TParams,
      TPayload,
      RemoveOutputParams<TEntity> | TResult
    > = async function (params, options) {
      const {
        repository,
        queryOptions,
        isAllowMultiple,
        isSoftDelete,
        shouldReturnEntity,
        shouldResetCache,
      } = { ...removeOptions(), ...(params.payload?.authorization?.filter?.methodOptions ?? {}) };
      const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, {
        relationOptions: ['*'],
        isDisableOrderBy: true,
        isDisableAttributes: true,
        isDisablePagination: true,
        ...queryOptions,
      });
      const result = await handler(typeQuery, params, options);
      const defaultParams = {
        isAllowMultiple,
        isSoftDelete,
        shouldReturnEntity,
        shouldResetCache,
      };

      if (result instanceof TypeormJsonQuery) {
        return Endpoint.defaultHandler.remove(repository, result.toQuery(), defaultParams);
      }

      if (result instanceof SelectQueryBuilder) {
        return Endpoint.defaultHandler.remove(repository, result, defaultParams);
      }

      return result;
    };

    return withMeta(removeHandler, removeOptions, Endpoint.defaultParams.remove);
  }

  /**
   * Restore operation
   */
  static restore<
    TParams extends RestoreRequestParams<TEntity>,
    TResult extends RestoreOutputParams<TEntity>,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    restoreOptions: TOptions<IRestoreParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<
      TParams,
      TPayload,
      TResult,
      TEntity,
      IRestoreLazyResult<TEntity>
    > = defaultHandler,
  ): IReturnWithMeta<TEntity, TParams, TPayload, RestoreOutputParams<TEntity> | TResult> {
    const restoreHandler: IReturn<
      TEntity,
      TParams,
      TPayload,
      RestoreOutputParams<TEntity> | TResult
    > = async function (params, options) {
      const { repository, isAllowMultiple, queryOptions, shouldResetCache } = {
        ...restoreOptions(),
        ...(params.payload?.authorization?.filter?.methodOptions ?? {}),
      };
      const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, {
        relationOptions: ['*'],
        isDisableOrderBy: true,
        isDisableAttributes: true,
        isDisablePagination: true,
        ...queryOptions,
      });
      const result = await handler(typeQuery, params, options);
      const defaultParams = { isAllowMultiple, shouldResetCache };

      if (result instanceof TypeormJsonQuery) {
        return Endpoint.defaultHandler.restore(repository, result.toQuery(), defaultParams);
      }

      if (result instanceof SelectQueryBuilder) {
        return Endpoint.defaultHandler.restore(repository, result, defaultParams);
      }

      return result;
    };

    return withMeta(restoreHandler, restoreOptions, Endpoint.defaultParams.restore);
  }

  /**
   * Custom operation handler with query builder
   */
  static customWithQuery<
    TParams extends ObjectLiteral,
    TResult,
    TEntity = ObjectLiteral,
    TPayload = Record<string, any>,
  >(
    customOptions: TOptions<ICustomWithQueryParams<TEntity, TParams, TResult>>,
    handler: ICrudListHandler<TParams, TPayload, TResult, TEntity, TResult>,
  ): IReturnWithMeta<TEntity, TParams, TPayload, TResult> {
    const customHandler: IReturn<TEntity, TParams, TPayload, TResult> = async function (
      params,
      options,
    ) {
      const { repository, queryOptions, input } = customOptions();
      const typeQuery = createTypeQuery(repository.createQueryBuilder(), params, queryOptions);

      if (typeof input === 'function') {
        const errors = await validate(
          plainToInstance(input as Constructable<Record<string, any>>, params ?? {}),
          {
            whitelist: true,
            groups: ['custom-with-query'],
            always: true,
            validationError: { target: false },
          },
        );

        if (errors.length > 0) {
          throw new BaseException({
            code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
            status: 422,
            message: 'Invalid request params.',
            payload: errors,
          });
        }
      }

      return handler(typeQuery, params, options);
    };

    return withMeta(customHandler, customOptions);
  }

  /**
   * Custom operation handler
   */
  static custom<TParams extends ObjectLiteral, TResult, TPayload = Record<string, any>>(
    customOptions: TOptions<ICustomParams<TParams, TResult>>,
    handler: ICustomHandler<TParams, TResult, TPayload>,
  ): IReturnWithMeta<never, TParams, TPayload, TResult> {
    const customHandler: IReturn<never, TParams, TPayload, TResult> = async function (
      params,
      options,
    ) {
      const { input } = customOptions();

      if (typeof input === 'function') {
        const errors = await validate(
          plainToInstance(input as Constructable<Record<string, any>>, params ?? {}),
          {
            whitelist: true,
            groups: ['custom'],
            always: true,
            validationError: { target: false },
          },
        );

        if (errors.length > 0) {
          throw new BaseException({
            code: CRUD_EXCEPTION_CODE.VALIDATION_FAILED,
            status: 422,
            message: 'Invalid request params.',
            payload: errors,
          });
        }
      }

      return handler(params, options);
    };

    return withMeta(customHandler, customOptions);
  }
}

export {
  Endpoint,
  CountRequestParams,
  CountOutputParams,
  ListRequestParams,
  ListOutputParams,
  ViewRequestParams,
  ViewOutputParams,
  CreateRequestParams,
  CreateOutputParams,
  UpdateRequestParams,
  UpdateOutputParams,
  RemoveRequestParams,
  RemoveOutputParams,
  RestoreRequestParams,
  RestoreOutputParams,
  CACHE_KEYS,
  getCrudCacheKey,
  CRUD_EXCEPTION_CODE,
};
