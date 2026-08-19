'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'df_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore unreadable storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full / disabled — cart still works for this session
    }
  }, [items, ready]);

  const value = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
    const mrpTotal = items.reduce((sum, i) => sum + (i.mrp || i.price || 0) * i.qty, 0);

    return {
      items,
      ready,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      mrpTotal,
      savings: Math.max(0, mrpTotal - subtotal),

      add(product, qty = 1) {
        setItems((current) => {
          const found = current.find((i) => i.id === product.id);
          if (found) {
            return current.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i));
          }
          return [
            ...current,
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              url: product.url,
              image: product.images && product.images[0],
              price: product.price,
              mrp: product.mrp,
              unit: product.unit,
              maxQty: product.maxQty || 99,
              qty,
            },
          ];
        });
      },

      setQty(id, qty) {
        setItems((current) =>
          current.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty || 99)) } : i)),
        );
      },

      remove(id) {
        setItems((current) => current.filter((i) => i.id !== id));
      },

      clear() {
        setItems([]);
      },
    };
  }, [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
