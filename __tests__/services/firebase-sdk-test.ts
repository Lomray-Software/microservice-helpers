import { expect } from 'chai';
import sinon from 'sinon';
import FirebaseSdk from '@services/firebase-sdk';
import RemoteConfig from '@services/remote-config';

describe('services/firebase-sdk', () => {
  const sandbox = sinon.createSandbox();
  const FirebaseAdmin = {
    initializeApp: () => null,
    credential: {
      cert: () => ({}),
    },
  };

  afterEach(() => {
    sandbox.restore();
    FirebaseSdk.init(FirebaseAdmin, {}, true);
  });

  it('should initialize firebase sdk with provided credential', async () => {
    const credential = { hello: 'world' };

    FirebaseSdk.init(FirebaseAdmin, { credential, hasConfigMs: false });

    const RemoteConfigMock = sandbox.stub(RemoteConfig, 'get');
    const FirebaseStub = sandbox.stub(FirebaseAdmin, 'initializeApp');

    sandbox.stub(FirebaseAdmin.credential, 'cert').returns(credential);

    const sdk = await FirebaseSdk.get();

    expect(sdk).to.equal(await FirebaseSdk.get());
    expect(RemoteConfigMock).to.not.called;
    expect(FirebaseStub).to.calledOnceWith({ credential });
  });

  it('should initialize firebase sdk with remote credential', async () => {
    FirebaseSdk.init(FirebaseAdmin);

    const remoteConf = { credential: { remote: 'config' } };

    const RemoteConfigMock = sandbox.stub(RemoteConfig, 'get').resolves(remoteConf);
    const FirebaseStub = sandbox.stub(FirebaseAdmin, 'initializeApp');

    sandbox.stub(FirebaseAdmin.credential, 'cert').returns(remoteConf.credential);

    const sdk = await FirebaseSdk.get();

    expect(sdk).to.equal(await FirebaseSdk.get());
    expect(RemoteConfigMock).to.calledOnce;
    expect(FirebaseStub).to.calledOnceWith(remoteConf);
  });
});
