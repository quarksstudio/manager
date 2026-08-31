export interface LocalSkillProps {
    name: string;
    version: string;
    path: string;
    hash?: string;
    source?: string;
    dependencies?: Record<string, string>;
    enabled: boolean;
    installedAt: string;
}
export declare class LocalSkillInstallation {
    private readonly props;
    private constructor();
    static restore(props: LocalSkillProps): LocalSkillInstallation;
    enable(): void;
    disable(): void;
    snapshot(): LocalSkillProps;
}
