import type { SkillExecution } from '../domain/skill-execution';

export interface RunningProcess {
  process: import('child_process').ChildProcess;
  cmd: string;
  args: string[];
}
export interface ProcessRunner {
  run(execution: SkillExecution): RunningProcess;
}
export class ExecuteSkillHandler {
  constructor(private readonly runner: ProcessRunner) {}
  execute(execution: SkillExecution): RunningProcess {
    return this.runner.run(execution);
  }
}
