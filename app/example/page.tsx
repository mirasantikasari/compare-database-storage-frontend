"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useAppDispatch, useAppSelector } from "@/hooks/useStore";
import { getExamplePosts, createExamplePost } from "@/store/controller/exampleController";
import type { ExamplePost } from "@/store/types/ExampleType";

export default function ExamplePage() {
  const dispatch = useAppDispatch();
  const { posts, loadingGet, errorGet, loadingPost, errorPost, createdPost } =
    useAppSelector((state) => state.example);

  const [form, setForm] = useState<ExamplePost>({ title: "", body: "" });

  // GET example: load a short list of posts on mount.
  useEffect(() => {
    dispatch(getExamplePosts());
  }, [dispatch]);

  // POST example: submit a new post.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(createExamplePost(form));
  };

  return (
    <AppLayout checkAuth={false}>
      <div className="mx-auto w-full max-w-md space-y-8 px-6 py-12">
        <section>
          <h1 className="mb-4 text-xl font-semibold">GET example</h1>

          {loadingGet && <p className="text-sm text-gray-500">Loading posts...</p>}

          {errorGet && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">{errorGet.message}</p>
            </div>
          )}

          {!loadingGet && !errorGet && (
            <ul className="space-y-2">
              {posts.map((post) => (
                <li key={post.id} className="rounded-md border border-gray-200 p-3">
                  <p className="text-sm font-medium">{post.title}</p>
                  <p className="text-xs text-gray-500">{post.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">POST example</h2>

          {errorPost && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">{errorPost.message}</p>
            </div>
          )}

          {createdPost && !errorPost && (
            <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">
              Post created with id {createdPost.id}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="body" className="mb-1 block text-sm font-medium">
                Body
              </label>
              <textarea
                id="body"
                required
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loadingPost}
              className="w-full rounded-md bg-black py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loadingPost ? "Submitting..." : "Create Post"}
            </button>
          </form>
        </section>
      </div>
    </AppLayout>
  );
}
