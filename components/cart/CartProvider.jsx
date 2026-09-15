'use client';

import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useSession } from '@/lib/useSession';

const CartContext = createContext(null);

/**
 * Where a cart is kept.
 *
 * The database has nowhere to hold a cart — `user` has no column for it, there
 * is no cart table, and the schema is shared with the live PHP site and not
 * ours to change. So the cart stays in this browser, but each account gets its
 * own shelf and so does a guest:
 *
 *   df_cart_guest      what someone not signed in has added
 *   df_cart_user_574   account 574's cart
 *
 * Signing out puts the account's cart away rather than deleting it, so the
 * next person on the device sees nothing, and signing back in brings it back.
 * It follows the account on this browser only; carrying it across devices
 * would need somewhere on the server to put it.
 */
const GUEST_KEY = 'df_cart_guest';
const userKey = (id) => `df_cart_user_${id}`;
// Earlier formats: v1 had no owner at all, v2 held one cart plus its owner.
const V1_KEY = 'df_cart_v1';
const V2_KEY = 'df_cart_v2';

function readShelf(key) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeShelf(key, items) {
  try {
    if (items.length) window.localStorage.setItem(key, JSON.stringify(items));
    else window.localStorage.removeItem(key);
  } catch {
    // storage full / disabled — cart still works for this session
  }
}

/** Moves a v2 cart onto the shelf of the account it was stamped with. */
function migrate() {
  try {
    window.localStorage.removeItem(V1_KEY);
    const v2 = JSON.parse(window.localStorage.getItem(V2_KEY) || 'null');
    if (Array.isArray(v2?.items) && v2.items.length) {
      const key = v2.owner != null ? userKey(v2.owner) : GUEST_KEY;
      writeShelf(key, mergeItems(readShelf(key), v2.items));
    }
    window.localStorage.removeItem(V2_KEY);
  } catch {
    // an unreadable old cart is simply not carried over
  }
}

/** Two carts as one, adding up the quantity of anything in both. */
function mergeItems(base, extra) {
  const merged = base.map((item) => ({ ...item }));
  for (const item of extra) {
    const found = merged.find((i) => i.id === item.id);
    if (found) {
      found.qty = Math.min(found.qty + item.qty, found.maxQty || item.maxQty || 99);
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  // The shelf the items on screen belong to; null until the session is known.
  const [shelf, setShelf] = useState(null);
  const { user, loading } = useSession();
  const migrated = useRef(false);
  // Read inside the effect below without making every cart change re-run it.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /**
   * Pick the shelf once we know who is signed in, and again whenever that
   * changes. Nothing is shown before then: an unanswered session looks signed
   * out, and guessing either way would flash one person's cart at another.
   */
  useEffect(() => {
    if (loading) return;
    if (!migrated.current) {
      migrate();
      migrated.current = true;
    }

    const next = user?.id != null ? userKey(user.id) : GUEST_KEY;
    if (next === shelf) return;

    // Anything added in the moment before the session answered has no shelf
    // yet and would be lost by loading one, so it is carried onto the first.
    // On a later switch the items on screen belong to the previous account and
    // stay on its shelf.
    const unsaved = shelf === null ? itemsRef.current : [];

    let loaded;
    if (next !== GUEST_KEY) {
      // Signing in: whatever was added as a guest joins the account's cart,
      // which is how add-to-cart-then-sign-in reaches checkout.
      loaded = mergeItems(mergeItems(readShelf(next), readShelf(GUEST_KEY)), unsaved);
      writeShelf(GUEST_KEY, []);
    } else {
      loaded = mergeItems(readShelf(GUEST_KEY), unsaved);
    }
    writeShelf(next, loaded);
    setItems(loaded);
    setShelf(next);
  }, [loading, user, shelf]);

  // Every change is saved to the shelf it was made on, and only once one is
  // chosen — writing sooner would drop an account's items on the guest shelf.
  useEffect(() => {
    if (shelf) writeShelf(shelf, items);
  }, [items, shelf]);

  const ready = shelf !== null;

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
