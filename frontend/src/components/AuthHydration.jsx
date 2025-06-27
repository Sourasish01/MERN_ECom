'use client';

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";

const AuthHydration = () => {
  const checkAuth = useUserStore((state) => state.checkAuth);
  const user = useUserStore((state) => state.user); // ✅ get current user state
  const getCartItems = useCartStore((state) => state.getCartItems);

  // 🟡 1st useEffect: Check login status on load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 🟢 2nd useEffect: Only run when user is available and authenticated
  useEffect(() => {
    if (user) {
      getCartItems();
    }
  }, [user, getCartItems]);

  return null;
};

export default AuthHydration;