"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/layouts/AppLayout";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { handleActionLogin } from "@/store/controller/authController";
import { handleCleanResponse } from "@/store/slices/authSlice";
import type { LoginRequest } from "@/store/types/AuthType";

export default function SignInPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, responseLogin, error } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });

  // Clear any stale response/error from a previous visit to this page.
  useEffect(() => {
    dispatch(handleCleanResponse());
  }, [dispatch]);

  useEffect(() => {
    if (responseLogin?.token) {
      localStorage.setItem("auth-key", responseLogin.token);
      router.push("/");
    }
  }, [responseLogin, router]);

  const onChange = (field: keyof LoginRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(handleActionLogin(form));
  };

  return (
    <AppLayout checkAuth={false}>
      <div className="flex min-h-screen flex-col justify-center px-6 py-12">
        <h1 className="mb-6 text-center text-2xl font-semibold">Sign In</h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">{error.message}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={onChange("email")}
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={onChange("password")}
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
