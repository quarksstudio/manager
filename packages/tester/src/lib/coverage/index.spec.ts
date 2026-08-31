import { collectSchemaPaths, CoverageTracker } from './index';

describe('contract obligation coverage', () => {
  it('matches concrete HTTP mocks to OpenAPI templated paths', () => {
    const schema = { openapi: '3.1.0', paths: { '/issues/{id}': { post: {} } } };
    const paths = collectSchemaPaths(schema);
    const tracker = new CoverageTracker({ schema: paths, assertions: [], invariants: [] });
    tracker.schemaPath('POST /issues/X1');
    expect(tracker.report().schemaCoverage).toBe(100);
  });
});
