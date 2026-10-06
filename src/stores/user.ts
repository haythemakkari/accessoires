"use client";
import { create } from "zustand";
import { fetcher } from "@/lib/client/fetcher";

export type ClientUser = { id: string; name: string; email: string; phone?: string; role: "customer" | "admin" };

type UserState = {
  user: ClientUser | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  set: (u: ClientUser | null) => void;
};

export const useUser = create<UserState>((set) => ({
  user: null,
  loaded: false,
  set: (user) => set({ user, loaded: true }),
  refresh: async () => {
    try {
      const { user } = await fetcher<{ user: ClientUser | null }>("/api/auth/me");
      set({ user, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    }
  },
}));
