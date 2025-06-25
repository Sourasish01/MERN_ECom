'use client';

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

const AuthHydration = () => {
  const checkAuth = useUserStore((state) => state.checkAuth); // updates the user state based on login status

  useEffect(() => {
    checkAuth(); // 🔐 check login status on app load
  }, [checkAuth]); 

  return null; // This component doesn't render anything
};

export default AuthHydration;