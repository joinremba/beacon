#!/usr/bin/env bun

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "init":
    await handleInit(args);
    break;
  case "check":
    await handleCheck(args);
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    printHelp();
    process.exit(1);
}

async function handleInit(_args: string[]) {
  console.log("beacon init — coming soon");
  console.log("This command will generate a .env.example from your beacon config.");
  process.exit(0);
}

async function handleCheck(_args: string[]) {
  console.log("beacon check — coming soon");
  console.log("This command will validate your current environment against your beacon schema.");
  process.exit(0);
}

function printHelp() {
  console.log(`
Usage: beacon <command> [options]

Commands:
  init           Generate .env.example from your config
  check          Validate current environment against your schema
  help           Show this help message

Options:
  -c, --config   Path to config file (default: beacon.config.ts)

Examples:
  bunx beacon init
  bunx beacon check
  bunx beacon check --config ./src/config.ts
`);
}
