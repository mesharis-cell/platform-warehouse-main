import { apiClient } from "@/lib/api/api-client";

const ORDER_BASE_PATH = "/client/v1/order";

export const getOrderApiPath = (orderId: string): string => `${ORDER_BASE_PATH}/${orderId}`;

export const patchOrder = (orderId: string, suffix: string, payload: Record<string, unknown>) =>
    apiClient.patch(`${ORDER_BASE_PATH}/${orderId}${suffix}`, payload);
