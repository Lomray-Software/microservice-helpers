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
    await tracer({
      IS_OPENTELEMETRY_ENABLE: false,
    } as ITracerConfig);

    expect(console.info as sinon.SinonStub).to.not.calledWith('opentelemetry initialized: ');
  });
});
