# NodeJS Microservices helpers for [microservices](https://github.com/Lomray-Software/microservices)

![npm](https://img.shields.io/npm/v/@lomray/microservice-helpers)
![GitHub](https://img.shields.io/github/license/Lomray-Software/microservice-helpers)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Lomray-Software_microservice-helpers&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Lomray-Software_microservice-helpers)

## COMMON ENVIRONMENTS:
- `NODE_ENV` - Can be `production` or `development` or `tests`. Default: `development`
- `ENVIRONMENT` - Extra environment name. Default: `prod`
- `MS_CONNECTION` - Invert json host and port (with protocol). Default: `http://127.0.0.1:8001`
- `MS_CONNECTION_SRV` - Invert json connection it is SRV record. Default: `false`
- `MS_NAME` - Microservice name. Default: `authentication`
- `MS_WORKERS` - Microservice queue workers count. Default: `5`
- `MS_ENABLE_REMOTE_MIDDLEWARE` - Enable remote middleware feature. Set `0` to disable. Default: `1` (enabled)
- `MS_REMOTE_CONFIG_ENABLE` - Enable remote config (get from configuration microservice). Set `0` to disable. Default: `1`
- `MS_CONFIG_NAME` - Configuration microservice name. Default: `configuration`
- `ENABLE_EVENTS` - Enable events if microservice support it. Default: `0`
- `MS_GRAFANA_LOKI_CONFIG` - Grafana loki config. Default: `null`
- `MS_ENABLE_GRAFANA_LOG` - Enable grafana loki log (config from configuration ms). Default: `0`
- `MS_OPENTELEMETRY_ENABLE` - Enable opentelemetry tracers. Default: `0`
- `IS_DISABLE_OPENTELEMETRY_TRACES` - Disable opentelemetry traces. Default: `0`
- `IS_DISABLE_OPENTELEMETRY_METRICS` - Disable opentelemetry metrics. Default: `0`
- `MS_OPENTELEMETRY_OTLP_URL` - Custom opentelemetry OTLP exporter URL. Default: `undefined`
- `MS_OPENTELEMETRY_OTLP_URL_SRV` - Custom opentelemetry OTLP URL it is SRV record. Default: `0`
- `MS_OPENTELEMETRY_DEBUG` - Enable debug log opentelemetry. Default: `0`
- `MS_CONSOLE_LOG_LEVEL` - Change console log level, [see all levels](https://github.com/winstonjs/winston#logging-levels). Default: `info`

## COMMON ENVIRONMENTS - DB SUPPORT:
- `DB_URL` - Database url connection string. Default: `undefined`. Please use URL or credentials.
- `DB_HOST` - Database host. Default: `127.0.0.1`
- `DB_PORT` - Database port. Default: `5432`
- `DB_USERNAME` - Database user name. Default: `postgres`
- `DB_PASSWORD` - Database password. Default: `example`
- `DB_DATABASE` - Database name. Default: `ms-microservice-name`
- `DB_FROM_CONFIG_MS` - Get DB credentials from configuration microservice. Set `0` to disable. Default: `1`

## COMMON ENVIRONMENTS - AWS SUPPORT:
- `AWS_ACCESS_KEY_ID` - AWS access key ID. Default: `undefined`
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key. Default: `undefined`
- `AWS_REGION` - AWS region. Default: `undefined`
- `AWS_BUCKET_NAME` - AWS S3 bucket name. Default: `undefined`
- `AWS_BUCKET_ACL` - AWS S3 bucket ACL (e.g.: public-read). Default: `undefined`
- `AWS_FROM_CONFIG_MS` - Get AWS credentials from configuration microservice. Set `0` to disable. Default: `1`

## COMMON ENVIRONMENTS - FIREBASE SUPPORT:
- `FIREBASE_CREDENTIAL` - Firebase credential JSON string. Default: `{}`
- `FIREBASE_FROM_CONFIG_MS` - Get firebase credential from configuration microservice. Set `0` to disable. Default: `1`

## This package contains:
 - Entities
    - IJson Query filter
 - Mocks
    - Typeorm
    - Typeorm extension
 - Helpers
    - Launchers (with/without db)
    - Create DB connection
    - Get common microservices constants ([see list ENVIRONMENT](#common-environments))
    - Get entity columns (EntityColumns)
    - Redact secrets for console outputs
    - Resolve SRV records
    - Tracer
 - Services
    - API Client (make requests to another microservices)
    - CRUD
    - Log
    - Microservice metadata
    - Remote config
    - Firebase SDK
 - Class validator: extra validators
 - Test helpers
 - Instrumentations for collect metrics

See [microservices](https://github.com/Lomray-Software/microservices) for example of usage.
