import { expect, test, describe } from "bun:test";
import { generateEnvExample } from "./cli-config";
import type { BeaconConfigFile } from "./cli-config";

describe("generateEnvExample", () => {
  test("generates basic env example", () => {
    const config: BeaconConfigFile = {
      schema: {
        DATABASE_URL: { type: "url", required: true, description: "PostgreSQL connection string" },
        PORT: { type: "port", default: 3000, description: "HTTP server port" },
        NODE_ENV: {
          type: "enum",
          values: ["development", "production"],
          default: "development",
        },
      },
    };

    const result = generateEnvExample(config);
    expect(result).toContain("DATABASE_URL");
    expect(result).toContain("PostgreSQL connection string");
    expect(result).toContain("PORT=3000");
    expect(result).toContain("development | production");
  });

  test("includes profile override when activeProfile is set", () => {
    const config: BeaconConfigFile = {
      schema: {
        DB_HOST: { type: "string", default: "localhost" },
      },
      profiles: {
        production: {
          DB_HOST: { type: "host", required: true, description: "Production DB host" },
        },
      },
    };

    const result = generateEnvExample(config, "production");
    expect(result).toContain("Profile: production");
    expect(result).toContain("Production DB host");
  });

  test("marks secret vars", () => {
    const config: BeaconConfigFile = {
      schema: {
        API_KEY: { type: "string", secret: true, description: "API secret key" },
      },
    };

    const result = generateEnvExample(config);
    expect(result).toContain("Secret: yes");
  });
});
