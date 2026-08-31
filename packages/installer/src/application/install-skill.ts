import { SkillCoordinate, SkillInstallation } from '../domain/installation';

export interface InstallSkillCommand {
  name: string;
  version: string;
  global?: boolean;
  cwd?: string;
  policy?: unknown;
  approvePermissions?: (denied: unknown) => Promise<boolean>;
}

export interface InstallWorkflow {
  authorize(command: InstallSkillCommand): Promise<void>;
  verifyAndInstall(command: InstallSkillCommand): Promise<void>;
}

export class InstallSkillHandler {
  constructor(private readonly workflow: InstallWorkflow) {}
  async execute(command: InstallSkillCommand): Promise<SkillInstallation> {
    const installation = new SkillInstallation(
      SkillCoordinate.create(command.name, command.version),
    );
    try {
      await this.workflow.authorize(command);
      installation.authorize();
      await this.workflow.verifyAndInstall(command);
      installation.verify();
      installation.complete();
      return installation;
    } catch (error) {
      installation.fail();
      throw error;
    }
  }
}
