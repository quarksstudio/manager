import { landingTiers as transform } from '@quarks.studio/package-search/web';
import { packageUrl } from './registry';
export function landingTiers(items: Array<{ id: string }>) {
  return transform(items, packageUrl);
}
