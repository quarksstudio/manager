export function getJsonPath(value: unknown, expression: string): unknown {
  if (expression === '$') return value;
  if (!expression.startsWith('$.')) throw new Error(`Unsupported JSONPath: ${expression}`);
  const tokens = expression.slice(2).match(/[^.[\]]+|\[(\d+)\]/g);
  if (!tokens) throw new Error(`Invalid JSONPath: ${expression}`);
  let current: unknown = value;
  for (const raw of tokens) {
    const token = raw.startsWith('[') ? Number(raw.slice(1, -1)) : raw;
    if (typeof token === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[token];
    } else {
      if (typeof current !== 'object' || current === null) return undefined;
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}
