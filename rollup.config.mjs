import typescript from 'rollup-plugin-ts';
import json from '@rollup/plugin-json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import del from 'rollup-plugin-delete';
import copy from 'rollup-plugin-copy';

export default {
  // build mocks for generate tslib with all helpers
  // separate mocks folder to prevent errors when use common import
  input: [
    'src/index.ts',
    'src/helpers/tracer.ts',
    'src/helpers/get-constants.ts',
    'src/mocks/index.ts',
    'src/test-helpers/index.ts'
  ],
  output: {
    dir: 'lib',
    format: 'cjs',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
    exports: 'auto',
  },
  external: [
    'rewiremock/node',
    'sinon',
    'winston',
    'firebase-admin',
    'fs',
    'dns',
    'typeorm',
    'class-validator',
    'class-transformer',
    '@lomray/microservice-nodejs-lib',
    '@lomray/microservice-remote-middleware',
    '@lomray/microservices-types',
    '@lomray/microservices-client-api/api-client-backend',
    '@lomray/microservices-client-api/endpoints',
    'class-validator-jsonschema',
    '@lomray/typeorm-json-query',
    'typeorm/query-builder/SelectQueryBuilder',
    'winston-loki',
    'klona/full',
    'traverse',
    'crypto',
    'uuid',
    '@opentelemetry/api',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/instrumentation-express',
    '@opentelemetry/instrumentation-http',
    '@opentelemetry/exporter-metrics-otlp-http',
    '@opentelemetry/instrumentation-pg',
    '@opentelemetry/instrumentation-winston',
    '@opentelemetry/host-metrics',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-node',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/instrumentation',
    '@opentelemetry/core',
    '@opentelemetry/api-metrics',
  ],
  plugins: [
    del({ targets: 'lib/*', runOnce: true }),
    peerDepsExternal(),
    json(),
    typescript({
      tsconfig: resolvedConfig => ({
        ...resolvedConfig,
        declaration: true,
        importHelpers: true,
        plugins: [
          {
            "transform": "@zerollup/ts-transform-paths",
            "exclude": ["*"]
          }
        ]
      }),
    }),
    copy({
      targets: [
        { src: 'package.json', dest: 'lib' },
        { src: 'README.md', dest: 'lib' },
        { src: 'typings/**/*', dest: 'lib/typings' },
      ]
    })
  ],
};
