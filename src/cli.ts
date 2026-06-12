#!/usr/bin/env bun

import { loadConfig, type BeaconConfigFile } from "./cli-config";
import { generateEnvExample } from "./cli-config";
import { runCheck } from "./cli-config";
import { color, icon, formatCheckResult, formatSummary, suggestKeys } from "./cli-format";

interface ParsedArgs {
  command: string;
  configPath: string;
  output: string;
  profile?: string;
  wantsHelp: boolean;
  helpTopic: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: "",
    configPath: "",
    output: ".env.example",
    wantsHelp: false,
    helpTopic: "",
  };

  let i = 0;

  const first = argv[i];
  if (first !== undefined && !first.startsWith("-")) {
    const val = first;
    if (val === "help") {
      args.command = "help";
      i++;
      args.helpTopic = argv[i] ?? "";
      return args;
    }
    args.command = val;
    i++;
  }

  while (i < argv.length) {
    const arg = argv[i] as string;
    if (arg === "-c" || arg === "--config") {
      i++;
      args.configPath = argv[i] ?? "";
    } else if (arg === "-o" || arg === "--output") {
      i++;
      args.output = argv[i] ?? ".env.example";
    } else if (arg === "--profile") {
      i++;
      args.profile = argv[i] ?? undefined;
    } else if (arg === "--help" || arg === "-h") {
      args.wantsHelp = true;
    } else if (args.command === "" && !arg.startsWith("-") && !args.wantsHelp) {
      args.command = arg;
    }
    i++;
  }

  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.wantsHelp || args.command === "help") {
    const topic = args.command === "help" ? args.helpTopic : args.command;
    printHelp(topic);
    return;
  }

  if (args.command === "") {
    printHelp("");
    return;
  }

  switch (args.command) {
    case "init":
      await handleInit(args);
      break;
    case "check":
      await handleCheck(args);
      break;
    default:
      console.error(` ${icon.fail} Unknown command: ${color.bold(args.command)}`);
      printHelp("");
      process.exit(1);
  }
}

async function handleInit(args: ParsedArgs) {
  let config: BeaconConfigFile;

  try {
    config = await loadConfig(args.configPath || undefined);
  } catch {
    config = { schema: {} };
  }

  const profile = args.profile;
  const example = generateEnvExample(config, profile);
  await Bun.write(args.output, example);
  console.log(` ${icon.pass} Generated ${color.bold(args.output)}`);
  if (profile) {
    console.log(`     Profile: ${color.cyan(profile)}`);
  }

  const count = Object.keys(
    profile && config.profiles?.[profile]
      ? { ...config.schema, ...config.profiles[profile] }
      : config.schema
  ).length;
  if (count > 0) {
    console.log(`     ${count} variable(s) documented`);
  }
  process.exit(0);
}

async function handleCheck(args: ParsedArgs) {
  let config: BeaconConfigFile;
  try {
    config = await loadConfig(args.configPath || undefined);
  } catch (err) {
    console.error(` ${icon.fail} ${(err as Error).message}`);
    process.exit(1);
  }

  const profile = args.profile;
  if (profile) {
    console.log(`   ${icon.info} Profile: ${color.cyan(profile)}\n`);
  }

  const result = await runCheck(config, profile);

  process.stdout.write(formatCheckResult(result.results));

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      const suggestions = suggestKeys(
        err.key,
        Object.keys(config.schema).filter((k) => k !== err.key)
      );
      if (suggestions.length > 0) {
        process.stdout.write(
          `     ${color.dim(`Did you mean ${suggestions.map((s) => color.cyan(s)).join(" or ")}?`)}\n`
        );
      }
    }
  }

  const passed = result.results.filter((r) => r.status === "ok").length;
  const failed = result.results.filter((r) => r.status !== "ok").length;
  process.stdout.write(formatSummary(passed, failed));

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

function printHelp(command: string) {
  if (command === "init") {
    console.log(`
${color.bold("USAGE")}
  beacon init [options]

${color.bold("DESCRIPTION")}
  Generate a .env.example file from your beacon config file.
  Reads your schema and creates a documented template with
  types, defaults, and descriptions for every variable.

${color.bold("OPTIONS")}
  -c, --config <path>  Path to config file
                       ${color.dim("(default: .beaconrc.json or beacon.config.json)")}
  -o, --output <path>  Output file for init
                       ${color.dim("(default: .env.example)")}
  --profile <name>     Profile to merge (staging, production, etc.)

${color.bold("EXAMPLES")}
  beacon init                              ${color.grey("# generate .env.example")}
  beacon init --profile production         ${color.grey("# merge production profile")}
  beacon init -c ./config/beacon.json      ${color.grey("# custom config path")}
`);
    return;
  }

  if (command === "check") {
    console.log(`
${color.bold("USAGE")}
  beacon check [options]

${color.bold("DESCRIPTION")}
  Validate the current process.env against your schema.
  Reports missing, invalid, and optional variables.

${color.bold("OPTIONS")}
  -c, --config <path>  Path to config file
                       ${color.dim("(default: .beaconrc.json or beacon.config.json)")}
  --profile <name>     Profile to merge (staging, production, etc.)

${color.bold("EXIT CODES")}
  0  All variables pass validation
  1  One or more variables are missing or invalid

${color.bold("EXAMPLES")}
  beacon check                             ${color.grey("# validate env")}
  beacon check --profile production        ${color.grey("# validate with profile")}
  beacon check -c ./config/beacon.json     ${color.grey("# custom config path")}
`);
    return;
  }

  console.log(`
${color.bold("beacon")} ${color.dim("- validate env vars, config, secrets, and feature gates")}

${color.bold("USAGE")}
  beacon <command> [options]

${color.bold("COMMANDS")}
  init   ${color.dim("Generate .env.example from your config")}
  check  ${color.dim("Validate current environment against your schema")}
  help   ${color.dim("Show help for a specific command")}

${color.bold("OPTIONS")}
  -c, --config <path>  Path to config file (default: .beaconrc.json or beacon.config.json)
  -o, --output <path>  Output file for init (default: .env.example)
  --profile <name>     Profile name to use (e.g. staging, production)

${color.bold("EXIT CODES")}
  0  Success
  1  Validation failure or error

${color.bold("EXAMPLES")}
  beacon init
  beacon init --profile production
  beacon check
  beacon check -c ./config/beacon.json --profile staging
  beacon help init
`);
}

await main();
