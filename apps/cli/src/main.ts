import { Command } from 'commander';
import { registerCommands } from './commands';
import { bootstrapEnv } from './bootstrap';

await bootstrapEnv();

const program = new Command();
registerCommands(program);
program.parse();
