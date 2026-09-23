import { Command } from 'commander';
import { registerCommands } from './commands';
import { bootstrapEnv, setupLogging } from './bootstrap';

await bootstrapEnv();
await setupLogging();

const program = new Command();
registerCommands(program);
program.parse();
