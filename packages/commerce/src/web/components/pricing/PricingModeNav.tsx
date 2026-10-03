import { QuarkTheme } from '@quarks.studio/web-ui';

export type PricingMode = 'products' | 'plans';

export interface PricingModeNavProps {
  mode: PricingMode;
  /**
   * The page's own path, without the query. The nav is plain links on purpose:
   * a tab that needs JavaScript is a tab that is missing from the first paint.
   */
  baseUrl: string;
  productsLabel?: string;
  plansLabel?: string;
}

export function PricingModeNav({
  mode,
  baseUrl,
  productsLabel = 'Certifications',
  plansLabel = 'Plans',
}: PricingModeNavProps) {
  const link = (target: PricingMode, label: string) => {
    const current = mode === target;
    return (
      <a
        href={`${baseUrl}?mode=${target}`}
        aria-current={current ? 'page' : undefined}
        className={
          current
            ? 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-900 underline underline-offset-4'
            : 'rounded-md px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800'
        }
      >
        {label}
      </a>
    );
  };

  return (
    <QuarkTheme>
      <nav
        aria-label="Pricing mode"
        data-testid="pricing-mode-nav"
        className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2"
      >
        {link('products', productsLabel)}
        {link('plans', plansLabel)}
      </nav>
    </QuarkTheme>
  );
}
