import { expect } from 'chai';
import sinon from 'sinon';
import tracer from '@helpers/tracer';
import type { ITracerConfig } from '@helpers/tracer';

// @TODO: add tests
describe('helpers/tracer', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('should not initialize opentelemetry if it is disabled', async () => {
    // @ts-ignore
    const constants: ITracerConfig = {
      IS_OPENTELEMETRY_ENABLE: false,
    };

    await tracer(constants);

    expect((console.info as sinon.SinonStub).calledWith('opentelemetry initialized: ')).to.be.false;
  });
});
