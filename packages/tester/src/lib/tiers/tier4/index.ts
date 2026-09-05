import { z } from 'zod';

const auditSchema = z
  .object({
    version: z.literal('1.0'),
    humanAudit: z
      .object({
        isAudited: z.literal(true),
        auditor: z.string().min(1),
        completedAt: z.string().datetime(),
      })
      .strict(),
    checklist: z
      .array(
        z.object({ id: z.string().min(1), passed: z.literal(true) }).strict(),
      )
      .min(1),
    signature: z.string().min(1),
  })
  .strict();

export function validateAuditContract(value: unknown): unknown {
  return auditSchema.parse(value);
}
