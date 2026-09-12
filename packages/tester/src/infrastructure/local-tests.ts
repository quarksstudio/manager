import { createRunLocalTests } from '../application/run-local-tests';
import { runAgentTests, runSkillTests } from '../lib/runner';
import { inspectLocalTestTarget } from './local-test-target';

export const runLocalTests = createRunLocalTests({
  inspect: inspectLocalTestTarget,
  runAgent: runAgentTests,
  runSkill: runSkillTests,
});
