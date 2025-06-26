'use client';

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore"; // 👈 import cart store

const AuthHydration = () => {
  const checkAuth = useUserStore((state) => state.checkAuth);
  const getCartItems = useCartStore((state) => state.getCartItems); // 👈 import function

  useEffect(() => {
    checkAuth();       // 🔐 Check if user is authenticated
    getCartItems();    // 🛒 Load user's cart from DB (if logged in)
  }, [checkAuth, getCartItems]);

  return null; // No UI rendering
};

export default AuthHydration;