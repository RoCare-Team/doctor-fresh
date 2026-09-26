'use client';

// The services someone has picked, kept across pages.
//
// A booking starts on a service page, is reviewed on /book and finished on
// /book/checkout, so the basket cannot live in one screen's state. It is kept
// in the browser rather than on the server: nothing here is private, and a
// visitor who has not signed in yet still gets to build their basket.

import { useCallback, useEffect, useState } from 'react';

const KEY = 'df-service-cart';
const CHANGED = 'df-service-cart-changed';

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((l) => l && l.id && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(lines) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch { /* a full or blocked store: the basket is simply not remembered */ }
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/** `[lines, { setQty, remove, clear, total, count }]` */
export function useServiceCart() {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    const refresh = () => setLines(read());
    window.addEventListener(CHANGED, refresh);
    window.addEventListener('storage', refresh); // another tab
    return () => {
      window.removeEventListener(CHANGED, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const setQty = useCallback((service, qty) => {
    const current = read().filter((l) => l.id !== service.id);
    const next = qty > 0
      ? [...current, {
        id: service.id,
        name: service.name,
        price: Number(service.price) || 0,
        mrp: Number(service.mrp) || 0,
        image: service.image || '',
        group: service.group || '',
        qty: Math.min(9, qty),
      }]
      : current;

    // Kept in the order they were added, so the basket does not reshuffle.
    const order = read().map((l) => l.id);
    next.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    write(next);
  }, []);

  const remove = useCallback((id) => write(read().filter((l) => l.id !== id)), []);
  const clear = useCallback(() => write([]), []);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.price * l.qty, 0);

  return [lines, {
    setQty, remove, clear, count, total, ready,
  }];
}
