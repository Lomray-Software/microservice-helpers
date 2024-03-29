import { expect } from 'chai';
import sinon from 'sinon';
import ConstantsMock from '@__mocks__/constants';
import GetConstants from '@helpers/get-constants';
import GetMsStartConfig from '@helpers/get-ms-start-config';

describe('helpers/get-ms-start-config', () => {
  const type = 'microservice';

  it('should correctly return microservice default config', () => {
    const { type: msType } = GetMsStartConfig(GetConstants(ConstantsMock), {
      type,
    });

    expect(msType).to.equal(type);
  });

  it('should correctly return config with db', () => {
    const { shouldUseDbRemoteOptions } = GetMsStartConfig(
      GetConstants({ ...ConstantsMock, withDb: true }),
      {
        type,
      },
    );

    expect(shouldUseDbRemoteOptions).to.true;
  });

  it('should correctly return config with register events', () => {
    const stub = sinon.stub();
    const { registerEvents } = GetMsStartConfig(GetConstants(ConstantsMock), {
      type,
      registerEvents: stub,
    });

    expect(registerEvents).to.not.equal(stub);
  });
});
