import type { OrderStatus } from "@venuepass/common/client";

export interface Order {
  id: string;
  userId: string;
  ticket: {
    id: string;
    title: string;
    price: number;
    userId: string;
  };
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
}
