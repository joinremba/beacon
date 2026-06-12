# @remba/beacon

[![npm version](https://img.shields.io/npm/v/@remba/beacon.svg)](https://www.npmjs.com/package/@remba/beacon)
[![Licence](https://img.shields.io/npm/l/@remba/beacon.svg)](LICENSE)
[![CI](https://github.com/joinremba/beacon/actions/workflows/ci.yml/badge.svg)](https://github.com/joinremba/beacon/actions/workflows/ci.yml)
![Bun](https://img.shields.io/badge/Bun-%3E%3D1.3.1-black)

Beacon helps TypeScript teams boot applications safely by validating environment variables, config, secrets, and runtime feature gates before production breaks.

## Features

- **Schema-based validation** — Define your env schema with simple string types (`"url"`, `"port"`, `"enum"`, etc.) or raw Zod schemas. Catch missing or malformed values at startup.
- **Missing variable detection** — Know exactly which variables are missing before your app starts. All errors are collected and reported together, not one at a time.
- **Redacted config logging** — Keep secrets out of logs and error messages automatically. Secret values are replaced with `[REDACTED]`.
- **Local/staging/production profiles** — Define different schemas per environment. Override or extend the base schema for each deployment target.
- **`.env.example` generation** — Generate an `.env.example` file from your schema (via CLI).
- **CLI** — Run `beacon init` to scaffold config and `beacon check` to validate before deploying.
- **Zero runtime overhead** — Validations run once at boot. After that, access is plain property reads.
- **Framework-agnostic** — Works with any TypeScript backend: Bun, Node.js, Express, Hono, Fastify, Next.js, Elysia.

## Installation

```sh
bun add @remba/beacon
```

## Quick Start

```ts
import { createBeacon } from "@remba/beacon";

const config = createBeacon({
  DATABASE_URL: { type: "url", required: true },
  REDIS_URL: { type: "url", required: true },
  NODE_ENV: {
    type: "enum",
    values: ["development", "test", "staging", "production"],
    default: "development",
  },
  PORT: { type: "port", default: 3000 },
  API_KEY: { type: "string", required: true, secret: true },
});

config.ensure();
// config is now safe to use:
const dbUrl = config.get<string>("DATABASE_URL");
```

If any variable is missing or invalid, `ensure()` throws a `ConfigValidationError` with all issues collected — so you fix everything at once, not iteratively.

## CLI

Beacon ships with a CLI for development workflows:

```sh
# Coming soon
bunx beacon init           # Generate .env.example from your schema
bunx beacon check          # Validate current environment
bunx beacon check -c ./src/config.ts
```

## Profiles

Define different schemas per environment. The profile merges over the base schema:

```ts
const config = createBeacon({
  schema: {
    DB_HOST: { type: "string", default: "localhost" },
    DB_PORT: { type: "port", default: 5432 },
  },
  profile: process.env.BEACON_PROFILE,
  profiles: {
    staging: {
      DB_HOST: { type: "string", required: true },
    },
    production: {
      DB_HOST: { type: "host", required: true },
      DB_PORT: { type: "port", required: true },
    },
  },
});
```

## API Reference

### `createBeacon(options)`

The default export. Accepts a `BeaconOptions` object and returns a config instance.

**Parameters**

| Option     | Type                                          | Description                                                 |
| ---------- | --------------------------------------------- | ----------------------------------------------------------- |
| `schema`   | `Record<string, SchemaEntry>`                 | Map of environment variable names to field definitions.     |
| `profile`  | `string`                                      | Active profile name. Merges matching entry from `profiles`. |
| `profiles` | `Record<string, Record<string, SchemaEntry>>` | Named profile overrides.                                    |

**SchemaEntry** can be either:

1. **String-based** — Simple type names for everyday use:

```ts
{
  type: "url"; // z.string().url()
  type: "number"; // z.coerce.number()
  type: "integer"; // z.coerce.number().int()
  type: "boolean"; // "true"/"false"/"1"/"0"
  type: "port"; // number between 1-65535
  type: "enum"; // requires values[]
  type: "email"; // z.string().email()
  type: "host"; // z.string()
  type: "string"; // z.string()
}
```

| Field         | Type        | Default | Description                          |
| ------------- | ----------- | ------- | ------------------------------------ |
| `type`        | `FieldType` | —       | The type to validate against.        |
| `required`    | `boolean`   | `true`  | Whether the variable must be set.    |
| `default`     | `unknown`   | —       | Default value if not set.            |
| `secret`      | `boolean`   | `false` | Redact value from errors and logs.   |
| `values`      | `string[]`  | —       | Allowed values (only for `"enum"`).  |
| `description` | `string`    | —       | Used when generating `.env.example`. |

2. **Zod schema** — Advanced users can pass Zod schemas directly:

```ts
{
  schema: z.string().min(1).max(255),
  required: true,
  secret: false,
}
```

**Returns**

A config instance with:

| Method / Property | Description                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `ensure()`        | Validates all env vars. Throws `ConfigValidationError` on failure. Returns the config instance for chaining. |
| `get<T>(key): T`  | Returns the validated value for the given key. Throws if called before `ensure()`.                           |
| `secret`          | Returns a `Record<string, boolean>` of which keys are marked as secrets.                                     |

### TypeScript Types

```ts
import type {
  BeaconOptions,
  Beacon,
  SchemaEntry,
  FieldDefinition,
  FieldType,
  ConfigError,
  ConfigValidationError,
} from "@remba/beacon";
```

## Examples

### Basic env validation

```ts
import { createBeacon } from "@remba/beacon";

const config = createBeacon({
  NODE_ENV: {
    type: "enum",
    values: ["development", "production", "test"],
    default: "development",
  },
  PORT: { type: "port", default: 3000 },
});

config.ensure();
console.log(config.get("PORT")); // 3000 (or the value of $PORT)
```

### With secrets redaction

```ts
const config = createBeacon({
  API_KEY: { type: "string", secret: true },
  DATABASE_URL: { type: "url", secret: true },
});

try {
  config.ensure();
} catch (err) {
  // Error messages will show [REDACTED] instead of actual secret values
  console.error(err.message);
}
```

### Custom error handling

```ts
import { ConfigValidationError } from "@remba/beacon";

try {
  config.ensure();
} catch (err) {
  if (err instanceof ConfigValidationError) {
    for (const issue of err.errors) {
      console.error(`[${issue.key}] ${issue.message}`);
    }
  }
  process.exit(1);
}
```

### Using Zod schemas directly

```ts
import { createBeacon } from "@remba/beacon";
import { z } from "zod";

const config = createBeacon({
  PORT: { schema: z.coerce.number().positive().max(9999), default: 3000 },
  WHITELIST: { schema: z.string().regex(/^[\d,]+$/) },
});
```

### Production profile

```ts
const config = createBeacon({
  schema: {
    DB_HOST: { type: "string", default: "localhost" },
    DB_PORT: { type: "port", default: 5432 },
  },
  profile: "production",
  profiles: {
    production: {
      DB_HOST: { type: "host", required: true },
      DB_PORT: { type: "port", required: true },
    },
  },
});
```

## Roadmap

**MVP** (current)

- Typed env validation with string-based types and Zod
- Missing variable detection (aggregated errors)
- Secrets redaction in errors and logs
- Local/staging/production profiles
- `.env.example` generation (CLI)
- `beacon check` CLI command

**V1**

- Feature gates from local config
- Kill-switch flags
- Encrypted `.env` support
- Secret rotation checklist
- CI validation action
- Docker/Kubernetes env checks
- Config drift detection

**V2**

- Hosted team secret sync
- Audit trail for config changes
- Deployment provider integrations
- GitHub Actions integration
- Remba Cloud dashboard

## Related Packages

- [@remba/catalog](https://github.com/joinremba/catalog) — Production-ready logging and error event layer built on Pino.
- [@remba/gate](https://github.com/joinremba/gate) — API safety layer: validation, responses, idempotency, rate limiting, and API keys.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, development process, and how to submit pull requests.

## License

MIT &mdash; see [LICENSE](LICENSE).
