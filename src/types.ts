import type { z } from "zod";

export type FieldType =
  | "string"
  | "url"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "port"
  | "host"
  | "email";

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  default?: unknown;
  secret?: boolean;
  values?: readonly string[];
  description?: string;
}

export interface FieldDefinitionWithSchema {
  schema: z.ZodType;
  required?: boolean;
  secret?: boolean;
  description?: string;
}

export type SchemaEntry = FieldDefinition | FieldDefinitionWithSchema;

export interface BeaconOptions {
  profile?: string;
  profiles?: Record<string, Record<string, SchemaEntry>>;
}

export interface Beacon {
  ensure(): Beacon;
  get<T = unknown>(key: string): T;
  readonly secret: Record<string, boolean>;
}
