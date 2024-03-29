/* eslint-disable @typescript-eslint/no-unsafe-argument */
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import type { SelectQueryBuilder } from 'typeorm';
import { getConnectionManager, EntityManager } from 'typeorm';

const sandbox = sinon.createSandbox();

/**
 * Replace entity manager methods with stub methods
 * (prevent trying to create connection and original requests to database)
 */
class EntityManagerMock extends EntityManager {
  queryBuilders: SelectQueryBuilder<any>[] = [];

  stubReturns() {
    this.save = sandbox.stub().callsFake((__, entities) => {
      if (Array.isArray(entities)) {
        return [{}];
      }

      return {};
    });
    this.increment = sandbox.stub().resolves({ affected: 0, generatedMaps: [] });
    this.decrement = sandbox.stub().resolves({ affected: 0, generatedMaps: [] });
    this.update = sandbox.stub().resolves({ affected: 0, generatedMaps: [] });
    this.count = sandbox.stub().resolves(0);
    this.find = sandbox.stub().resolves({});
    this.findOne = sandbox.stub().resolves({});
    this.findByIds = sandbox.stub().resolves([]);
    this.delete = sandbox.stub().resolves({ affected: 0 });
    this.restore = sandbox.stub().resolves({ affected: 0, generatedMaps: [] });
    this.recover = sandbox.stub().resolves([]);
    this.remove = sandbox.stub().resolves({});
    this.delete = sandbox.stub().resolves({ raw: '', affected: 0 });
    this.softRemove = sandbox.stub().resolves({});
    this.softDelete = sandbox.stub().resolves({ affected: 0, generatedMaps: [] });
    this.upsert = sandbox.stub().resolves({ identifiers: [], generatedMaps: [] });
    this.query = sandbox.stub().resolves();
    // @ts-ignore
    this.create = sandbox.stub().callsFake((...args) => super.create(...args));

    this.transaction = (...args: any) => args?.[1]?.(this) ?? args?.[0](this);
    this.getRepository = sandbox.stub().callsFake((repo) => super.getRepository(repo));
    this.getCustomRepository = sandbox.stub().callsFake((repo) => super.getCustomRepository(repo));
    this.createQueryBuilder = sandbox.stub().callsFake((...args) => {
      const qb = super.createQueryBuilder(...args);

      this.queryBuilders.push(qb);

      return qb;
    });
  }

  // @ts-ignore
  constructor(...args) {
    // @ts-ignore
    super(...args);
    this.stubReturns();
  }

  reset(shouldKeepBuilders = false) {
    if (!shouldKeepBuilders) {
      this.queryBuilders = [];
    }

    this.stubReturns();
  }
}

let customEntities = [];
let customSubscribers = [];

try {
  customEntities = JSON.parse(process.env['TYPEORM_MOCK_ENTITIES'] || '[]');
  customSubscribers = JSON.parse(process.env['TYPEORM_MOCK_SUBSCRIBERS'] || '[]');
} catch (e) {
  //
}

// Create fake connection
const fakeConnection = getConnectionManager().create({
  type: 'postgres',
  entities: ['src/entities/*.ts', '__mocks__/entities/*.ts', ...customEntities],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts', ...customSubscribers],
  synchronize: true,
  logging: false,
});

// @ts-ignore
fakeConnection.buildMetadatas();

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/unbound-method
const prevFindMetaData = fakeConnection.findMetadata;

// @ts-ignore
fakeConnection.findMetadata = function (target) {
  let metadata = prevFindMetaData.call(fakeConnection, target);

  /**
   * We need this implementation because when tests run with --watch flag,
   * every rerun tests add new entities to 'getMetadataArgsStorage'
   * and we lose links to class
   */
  if (!metadata) {
    metadata = this.entityMetadatas.find(
      (md) =>
        // @ts-ignore
        md.target.name === target.name,
    );
  }

  return metadata;
};

const queryBuilderUpdateMock = () =>
  ({
    execute: { affected: 0, generatedMaps: [] },
  }) as const;

const queryBuilderDeleteMock = () => queryBuilderUpdateMock();

const queryBuilderMock = () =>
  ({
    getManyAndCount: [[], 0],
    getMany: [],
    getCount: 0,
    getOne: {},
    getOneOrFail: {},
    getRawMany: [],
    getRawOne: {},
    insert: { identifiers: [], generatedMaps: [] },
    execute: {},
  }) as const;

const queryBuilder = Object.entries(queryBuilderMock()).reduce(
  (res, [method, value]) => ({ ...res, [method]: sandbox.stub().resolves(value) }),
  {},
) as { [key in keyof ReturnType<typeof queryBuilderMock>]: sinon.SinonStub };

const queryUpdateBuilder = Object.entries(queryBuilderUpdateMock()).reduce(
  (res, [method, value]) => ({ ...res, [method]: sandbox.stub().resolves(value) }),
  {},
) as { [key in keyof ReturnType<typeof queryBuilderUpdateMock>]: sinon.SinonStub };

const queryDeleteBuilder = Object.entries(queryBuilderDeleteMock()).reduce(
  (res, [method, value]) => ({ ...res, [method]: sandbox.stub().resolves(value) }),
  {},
) as { [key in keyof ReturnType<typeof queryBuilderDeleteMock>]: sinon.SinonStub };

// eslint-disable-next-line @typescript-eslint/unbound-method
const prevCreateQueryBuilder = fakeConnection.createQueryBuilder;

// @ts-ignore
fakeConnection.createQueryBuilder = function (...args) {
  const qb = Object.assign(prevCreateQueryBuilder.call(fakeConnection, ...args), queryBuilder);
  const qbPrevUpdate = qb.update;
  const qbPrevDelete = qb.delete;
  // @ts-ignore
  const mockUpdate = (...args2) =>
    Object.assign(qbPrevUpdate.call(qb, ...args2), queryUpdateBuilder);
  // @ts-ignore
  const mockDelete = (...args2) =>
    Object.assign(qbPrevDelete.call(qb, ...args2), queryDeleteBuilder);

  qb.update = mockUpdate;
  qb.delete = mockDelete;
  qb.clone = () =>
    Object.assign(prevCreateQueryBuilder.call(fakeConnection, ...args), queryBuilder, {
      update: mockUpdate,
      delete: mockDelete,
      clone: qb.clone,
    });

  return qb;
};

type TEntityManagerMock = InstanceType<typeof EntityManagerMock>;

const entityManager = new EntityManagerMock(fakeConnection) as EntityManagerMock & {
  [key in keyof TEntityManagerMock]: TEntityManagerMock[key] extends (...args: any[]) => any
    ? sinon.SinonStub
    : TEntityManagerMock[key];
};

sandbox.stub(fakeConnection, 'manager').value(entityManager);
sandbox.stub(fakeConnection, 'close');

const stubs = {
  createConnection: sandbox.stub().resolves(fakeConnection),
};

const prevReset = sandbox.reset.bind(sandbox);

sandbox.reset = () => {
  prevReset();
  stubs.createConnection.resolves(fakeConnection);
  sandbox.stub(fakeConnection, 'manager').value(entityManager);
  entityManager.reset();

  const qbMock = queryBuilderMock();
  const qbMockUpdate = queryBuilderUpdateMock();

  Object.entries(queryBuilder).forEach(([method, stub]) => {
    stub.resolves(qbMock[method]);
  });
  Object.entries(queryUpdateBuilder).forEach(([method, stub]) => {
    stub.resolves(qbMockUpdate[method]);
  });
};

const Typeorm = {
  sandbox,
  stubs,
  entityManager,
  queryBuilder,
  queryUpdateBuilder,
  mock: rewiremock('typeorm').callThrough().with(stubs) as any,
};

export default Typeorm;
