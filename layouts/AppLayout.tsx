"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { getProfile } from "@/store/controller/authController";

interface AppLayoutProps {
  children: React.ReactNode;
  checkAuth?: boolean;
}

export function AppLayout({ children, checkAuth = true }: AppLayoutProps) {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!checkAuth || profile) return;
    if (typeof window === "undefined") return;

    const hasAuthKey = localStorage.getItem("auth-key");
    if (hasAuthKey) {
      dispatch(getProfile());
    }
  }, [checkAuth, profile, dispatch]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white dark:bg-black">
      <main className="flex-1">{children}</main>
    </div>
  );
}
