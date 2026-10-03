export type PaymentLinkTarget =
  | {
      kind: 'certification';
      packageId: string;
      versionId: string;
      productId: string;
    }
  | { kind: 'plan'; packageId: string; productId: string };

/** A target plus the gateway that has to build the link for it. */
export type PaymentLinkRequest = PaymentLinkTarget & { system: string };

const seg = (value: string) => encodeURIComponent(value);

/**
 * Both link routes carry the product id and the product's own `kind` decides
 * what the server builds, so the path never repeats it. The segment count
 * separates the two: a plan is two segments under `gateway/`, a certification
 * is three. The `@` stays literal between two encoded segments because that is
 * where Nest splits `:namePackage@:version`.
 */
export function paymentLinkPath(
  system: string,
  target: PaymentLinkTarget,
): string {
  if (target.kind === 'plan') {
    return `gateway/${seg(system)}/${seg(target.productId)}/${seg(target.packageId)}`;
  }
  const pinned = `${seg(target.packageId)}@${seg(target.versionId)}`;
  return `gateway/${seg(system)}/${seg(target.productId)}/${pinned}`;
}
