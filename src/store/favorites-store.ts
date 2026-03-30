import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesStore {
  favorites: string[]; // ticker 배열
  toggle: (ticker: string) => void;
  has: (ticker: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggle: (ticker) =>
        set((state) => ({
          favorites: state.favorites.includes(ticker)
            ? state.favorites.filter((t) => t !== ticker)
            : [...state.favorites, ticker],
        })),
      has: (ticker) => get().favorites.includes(ticker),
      clear: () => set({ favorites: [] }),
    }),
    {
      name: 'krx-favorites',
    }
  )
);
