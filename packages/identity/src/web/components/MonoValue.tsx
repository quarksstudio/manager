import type { ReactNode } from 'react';

/** Renders hashes, tokens and addresses in the monospaced enterprise style. */
export function MonoValue({
  value,
  className = '',
}: {
  value: ReactNode;
  className?: string;
}) {
  return (
    <code className={`break-all font-mono text-xs text-slate-300 ${className}`}>
      {value}
    </code>
  );
}
