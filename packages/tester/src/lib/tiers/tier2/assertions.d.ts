import type { AgentAssertion, SkillAssertion } from '../../types';
export declare function evaluateSkillAssertion(
  assertion: SkillAssertion,
  output: unknown,
  workspace: string,
): Promise<string>;
export declare function evaluateAgentAssertion(
  assertion: AgentAssertion,
  output: unknown,
  events?: Array<{
    tool: string;
  }>,
): string;
