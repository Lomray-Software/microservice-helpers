import { Gateway, Microservice, Socket } from '@lomray/microservice-nodejs-lib';
import type { IMiddlewareRepository } from '@lomray/microservice-remote-middleware';
import {
  RemoteMiddlewareClient,
  RemoteMiddlewareServer,
} from '@lomray/microservice-remote-middleware';
import { expect } from 'chai';
import rewiremock from 'rewiremock';
import sinon from 'sinon';
import type { ConnectionOptions } from 'typeorm';
import type { start as OriginalStart, run as OriginalRun } from '@helpers/launchers';
import { TypeormMock } from '@mocks/index';
import Jobs from '@services/jobs';
import Log from '@services/log';
import RemoteConfig from '@services/remote-config';
import waitResult from '@test-helpers/wait-result';

const CreateDbConnection = sinon.stub().resolves();
const { start, run } = rewiremock.proxy<{
  start: typeof OriginalStart;
  run: typeof OriginalRun;
}>(() => require('@helpers/launchers'), {
  '@helpers/create-db-connection': CreateDbConnection,
});

describe('helpers/launchers', () => {
  const sandbox = sinon.createSandbox();
  const msOptions = { name: 'ms-name' };
  const msParams = { logDriver: false };
  const dbOptions: ConnectionOptions = { type: 'postgres' };

  before(() => {
    TypeormMock.sandbox.reset();
  });

  afterEach(() => {
    sandbox.restore();
    CreateDbConnection.reset();
  });

  it('should correctly start microservice with db connection', async () => {
    const spyCreate = sandbox.spy(Microservice, 'create');
    const registerMethodsStub = sandbox.stub();
    const registerEventsStub = sandbox.stub();
    const registerJobsStub = sandbox.stub();
    const beforeStartStub = sandbox.stub();
    const beforeCreateMicroserviceStub = sandbox.stub();
    const initRemoteMiddlewareStub = sandbox.stub();
    let stubbedStart;
    let addRegisterEndpointSpy;
    let obtainMiddlewares;

    const remoteConfigStub = sandbox.stub(RemoteConfig, 'init');
    const remoteMiddlewareStub = sandbox
      .stub(RemoteMiddlewareClient, 'create')
      .callsFake((...args) => {
        remoteMiddlewareStub.restore();

        const rmMiddleware = RemoteMiddlewareClient.create(...args);

        addRegisterEndpointSpy = sandbox.spy(rmMiddleware, 'addRegisterEndpoint');
        obtainMiddlewares = sandbox.stub(rmMiddleware, 'obtainMiddlewares').resolves();

        return rmMiddleware;
      });

    await run({
      type: 'microservice',
      msOptions,
      msParams,
      dbOptions,
      hooks: {
        afterCreateMicroservice: (microservice) => {
          stubbedStart = sandbox.stub(microservice, 'start').resolves();
        },
        afterInitRemoteMiddleware: initRemoteMiddlewareStub,
        beforeStart: beforeStartStub,
        beforeCreateMicroservice: beforeCreateMicroserviceStub,
      },
      registerMethods: registerMethodsStub,
      registerEvents: registerEventsStub,
      registerJobs: registerJobsStub,
    });

    const [createOptions, createParams] = spyCreate.firstCall.args;

    expect(createOptions).to.deep.equal(msOptions);
    expect(createParams).to.deep.equal(msParams);
    expect(CreateDbConnection).to.calledOnce;
    expect(stubbedStart).to.calledOnce;
    expect(beforeStartStub).to.calledOnce;
    expect(beforeCreateMicroserviceStub).to.calledOnce;
    expect(initRemoteMiddlewareStub).to.calledOnce;
    expect(addRegisterEndpointSpy).to.calledOnce;
    expect(obtainMiddlewares).to.calledOnce;
    expect(remoteConfigStub).to.calledOnceWith(Microservice.getInstance(), {
      msName: msOptions.name,
      msConfigName: 'configuration',
      isOffline: false,
    });
    expect(registerMethodsStub).to.calledOnceWith(Microservice.getInstance());
    expect(registerEventsStub).to.calledOnceWith(Microservice.getInstance());
    expect(registerJobsStub).to.calledOnceWith(Jobs.get());
  });

  it('should correctly start gateway', async () => {
    const spyCreate = sandbox.spy(Gateway, 'create');
    let stubbedStart;
    let addRegisterEndpointSpy;
    let addObtainEndpointSpy;

    const remoteMiddlewareStub = sandbox
      .stub(RemoteMiddlewareServer, 'create')
      .callsFake((...args) => {
        remoteMiddlewareStub.restore();

        const rmMiddleware = RemoteMiddlewareServer.create(...args);

        addRegisterEndpointSpy = sandbox.spy(rmMiddleware, 'addRegisterEndpoint');
        addObtainEndpointSpy = sandbox.stub(rmMiddleware, 'addObtainEndpoint');

        return rmMiddleware;
      });

    await start({
      type: 'gateway',
      msOptions,
      msParams,
      remoteMiddleware: {
        isEnable: true,
        type: 'server',
        getRepository: () => ({ this: 'is repository' }) as unknown as IMiddlewareRepository,
      },
      remoteConfig: { isDisable: false },
      hooks: {
        afterCreateMicroservice: (gateway) => {
          stubbedStart = sandbox.stub(gateway, 'start').resolves();
        },
      },
    });

    const [createOptions, createParams] = spyCreate.firstCall.args;

    expect(createOptions).to.deep.equal(msOptions);
    expect(createParams).to.deep.equal(msParams);
    expect(stubbedStart).to.calledOnce;
    expect(addRegisterEndpointSpy).to.calledOnce;
    expect(addObtainEndpointSpy).to.calledOnce;
  });

  it('should correctly start microservice without remote middleware & remote config', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').resolves();
    sandbox.stub(RemoteMiddlewareClient, 'instance' as never).value(undefined);
    sandbox.stub(RemoteConfig, 'instance' as never).value(undefined);

    await start({
      type: 'microservice',
      msOptions,
      msParams,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(RemoteMiddlewareClient.getInstance()).to.undefined;
    expect(RemoteConfig.getInstance()).property('params').property('isOffline').equal(true);
  });

  it('should throw error if microservice start failed', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').rejects();
    sandbox.stub(process, 'exit');

    const res = start({
      type: 'microservice',
      msOptions,
      msParams,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(await waitResult(res)).to.throw();
  });

  it('should correctly start microservice with winston loki transport: options from environment', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').resolves();

    const enableLokiStub = sandbox.stub(Log, 'enableLokiTransport');

    await start({
      type: 'microservice',
      msOptions,
      msParams,
      logGrafana: { host: 'https://demo.host' },
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(enableLokiStub).to.calledOnce;
  });

  it('should correctly start microservice with winston loki transport: options from remote config', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').resolves();
    sandbox.stub(RemoteConfig, 'get').resolves();

    const enableLokiStub = sandbox.stub(Log, 'enableLokiTransport');

    await start({
      type: 'microservice',
      msOptions,
      msParams,
      logGrafana: true,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(enableLokiStub).to.calledOnce;
  });

  it('should correctly run microservice without db', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').resolves();

    await run({
      type: 'microservice',
      msOptions,
      msParams,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(CreateDbConnection).to.not.calledOnce;
  });

  it('should correctly run microservice with db', async () => {
    sandbox.stub(Microservice.getInstance(), 'start').resolves();

    await run({
      type: 'microservice',
      msOptions,
      msParams,
      dbOptions,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
    });

    expect(CreateDbConnection).to.calledOnce;
  });

  it('should correctly run microservice with socket', async () => {
    const spyCreate = sandbox.spy(Socket, 'create');
    const registerRoomsStub = sandbox.stub();
    let stubbedStart;

    await run({
      type: 'socket',
      msOptions,
      msParams,
      registerRooms: registerRoomsStub,
      remoteMiddleware: { isEnable: false, type: 'client' },
      remoteConfig: { isDisable: true },
      hooks: {
        afterCreateMicroservice: (microservice) => {
          stubbedStart = sandbox.stub(microservice, 'start').resolves();
        },
      },
    });

    expect(stubbedStart).to.calledOnce;
    expect(spyCreate).to.calledOnce;
    expect(registerRoomsStub).to.calledOnceWith(Socket.getInstance());
  });
});
