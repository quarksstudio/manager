import { SkillInstallation } from '../domain/installation';
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
export declare class InstallSkillHandler {
    private readonly workflow;
    constructor(workflow: InstallWorkflow);
    execute(command: InstallSkillCommand): Promise<SkillInstallation>;
}
