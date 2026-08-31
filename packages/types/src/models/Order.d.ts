export interface OrderInterface {
    parent: string;
    id: string;
    priceAtPurchase: number;
    status: string;
    createdAt: Date;
    type: string;
    orderId: number;
    updatedAt: Date;
}
export interface OrderProps extends Omit<OrderInterface, 'token' | 'createdAt' | 'reports'> {
    publishedAt: Date;
}
