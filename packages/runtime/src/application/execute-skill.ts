import type { SkillExecution } from '../domain/skill-execution';

export interface RunningProcess {
  process: import('child_process').ChildProcess;
  cmd: string;
  args: string[];
}
export interface ProcessRunner {
  run(execution: SkillExecution): RunningProcess;
}
/**
 * Trusted host implementation, configured by the application (never by a skill).
 * Must enforce execution.permissions for filesystem, network and subprocesses,
 * or reject before starting anything. Merely declaring capabilities is insufficient.
 */
export interface PermissionEnforcingHost extends ProcessRunner {}

export class ExecuteSkillHandler {
  constructor(private readonly runner: ProcessRunner) {}
  execute(execution: SkillExecution): RunningProcess {
    return this.runner.run(execution);
  }
}
