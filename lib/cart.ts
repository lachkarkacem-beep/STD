"use client";

export type CartLine = { id: string; finish: string; qty: number };

const CART_KEY = "std-cart";
export const FINISH_KEY = "std-finish";

export function readCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeCart(cart: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // storage unavailable (private browsing, quota) — cart just won't persist
  }
}

export function addToCart(id: string, finish: string, qty: number): CartLine[] {
  const cart = readCart();
  const line = cart.find((l) => l.id === id && l.finish === finish);
  if (line) line.qty += qty;
  else cart.push({ id, finish, qty });
  writeCart(cart);
  return cart;
}

export function removeLine(id: string, finish: string): CartLine[] {
  const cart = readCart().filter((l) => !(l.id === id && l.finish === finish));
  writeCart(cart);
  return cart;
}

export function clearCart() {
  writeCart([]);
}

export function cartCount(cart: CartLine[]) {
  return cart.reduce((n, l) => n + l.qty, 0);
}

export function readFinish(fallback: string): string {
  try {
    return localStorage.getItem(FINISH_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeFinish(id: string) {
  try {
    localStorage.setItem(FINISH_KEY, id);
  } catch {
    // ignore
  }
}
