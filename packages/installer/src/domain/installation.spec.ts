import { SkillCoordinate, SkillInstallation } from './installation';

describe('SkillInstallation aggregate', () => {
  it('completes only through the valid lifecycle', () => {
    const installation = new SkillInstallation(
      SkillCoordinate.create('@scope/demo', '1.0.0'),
    );
    installation.authorize();
    installation.verify();
    installation.complete();
    expect(installation.status).toBe('installed');
  });
  it('rejects skipped transitions', () => {
    const installation = new SkillInstallation(
      SkillCoordinate.create('demo', '1.0.0'),
    );
    expect(() => installation.complete()).toThrow('Cannot transition');
  });
});
