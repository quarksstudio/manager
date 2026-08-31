export type InstallationState = 'requested' | 'authorized' | 'verified' | 'installed' | 'failed';
export declare class SkillCoordinate {
    readonly name: string;
    readonly version: string;
    private constructor();
    static create(name: string, version: string): SkillCoordinate;
}
export declare class SkillInstallation {
    readonly coordinate: SkillCoordinate;
    private state;
    constructor(coordinate: SkillCoordinate);
    authorize(): void;
    verify(): void;
    complete(): void;
    fail(): void;
    get status(): InstallationState;
    private transition;
}
