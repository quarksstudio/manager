import type { LocalSkillInstallation } from '../domain/local-skill';
export interface LocalSkillRepository {
  find(name: string, version: string): Promise<LocalSkillInstallation | null>;
  list(): Promise<LocalSkillInstallation[]>;
  save(skill: LocalSkillInstallation): Promise<void>;
  remove(name: string, version: string): Promise<void>;
}
