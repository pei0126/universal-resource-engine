import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  cartItemId: string; // Unique ID for cart item (id + dates)
  id: string; // Original product id
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  tenantId: string;
  resourceType: "SALES" | "RENTAL" | "EQUIPMENT";
  startDate?: string;
  endDate?: string;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const cartItemId = `${item.id}-${item.startDate || 'none'}-${item.endDate || 'none'}`;
          const existingItem = state.items.find((i) => i.cartItemId === cartItemId);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, cartItemId }] };
        });
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },
      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'shopping-cart',
    }
  )
);
