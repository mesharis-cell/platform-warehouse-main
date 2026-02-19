"use client";

/**
 * In-memory cart utilities (non-persistent)
 */
let inMemoryCart: LocalCartItem[] = [];

export interface LocalCartItem {
    assetId: string;
    assetName: string;
    quantity: number;
    availableQuantity: number;
    volume: number;
    weight: number;
    dimensionLength: number;
    dimensionWidth: number;
    dimensionHeight: number;
    category: string;
    image?: string;
    fromCollection?: string;
    fromCollectionName?: string;
    addedAt: number;
}

/**
 * Save cart to in-memory store
 */
export function saveCart(items: LocalCartItem[]): void {
    inMemoryCart = [...items];
}

/**
 * Load cart from in-memory store
 */
export function loadCart(): LocalCartItem[] {
    return [...inMemoryCart];
}

/**
 * Clear cart from in-memory store
 */
export function clearCart(): void {
    inMemoryCart = [];
}

/**
 * Get cart item count
 */
export function getCartItemCount(): number {
    const items = loadCart();
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Check if asset is in cart
 */
export function isInCart(assetId: string): boolean {
    const items = loadCart();
    return items.some((item) => item.assetId === assetId);
}

/**
 * Get item quantity from cart
 */
export function getCartItemQuantity(assetId: string): number {
    const items = loadCart();
    const item = items.find((i) => i.assetId === assetId);
    return item?.quantity || 0;
}
