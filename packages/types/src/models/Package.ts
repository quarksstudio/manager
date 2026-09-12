export interface PaymentInterface {
  value: number;
  currency: string;
  kind: string;
}

export interface PackageInterface {
  id: string;
  parent?: string;
  description: string;
  authors: string[];
  tags: string[];
  payment?: PaymentInterface | null;
  createdAt: Date;
  updatedAt: Date;
  downloads?: number;
  downloadsSince?: string;
  canEditMetadata?: boolean;
}
