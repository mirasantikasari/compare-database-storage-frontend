import axios, { isAxiosError } from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiErrorResponse } from "../types/ApiError";
import type { ExamplePost } from "../types/ExampleType";

// Public placeholder API — used here only to demonstrate a real GET/POST round trip.
// Swap this for your own `api` instance from "@/services/api" once you have a real backend.
const exampleApi = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
});

function toApiError(error: unknown): ApiErrorResponse {
  if (isAxiosError(error)) {
    return (
      error.response?.data ?? { message: error.message || "Network error" }
    );
  }
  return { message: "Unexpected error" };
}

export const getExamplePosts = createAsyncThunk(
  "example/getPosts",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await exampleApi.get<ExamplePost[]>("/posts?_limit=5");
      return response.data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const createExamplePost = createAsyncThunk(
  "example/createPost",
  async (payload: ExamplePost, { rejectWithValue }) => {
    try {
      const response = await exampleApi.post<ExamplePost>("/posts", payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);
