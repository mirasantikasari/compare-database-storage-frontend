import { createSlice } from "@reduxjs/toolkit";
import { getExamplePosts, createExamplePost } from "../controller/exampleController";
import type { ExamplePost } from "../types/ExampleType";
import type { ApiErrorResponse } from "../types/ApiError";

interface ExampleState {
  posts: ExamplePost[];
  loadingGet: boolean;
  errorGet: ApiErrorResponse | null;

  createdPost: ExamplePost | null;
  loadingPost: boolean;
  errorPost: ApiErrorResponse | null;
}

const initialState: ExampleState = {
  posts: [],
  loadingGet: false,
  errorGet: null,

  createdPost: null,
  loadingPost: false,
  errorPost: null,
};

const exampleSlice = createSlice({
  name: "example",
  initialState,
  reducers: {
    resetExampleErrors(state) {
      state.errorGet = null;
      state.errorPost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getExamplePosts.pending, (state) => {
        state.loadingGet = true;
        state.errorGet = null;
      })
      .addCase(getExamplePosts.fulfilled, (state, action) => {
        state.loadingGet = false;
        state.posts = action.payload;
      })
      .addCase(getExamplePosts.rejected, (state, action) => {
        state.loadingGet = false;
        state.errorGet =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Failed to load posts" };
      })

      .addCase(createExamplePost.pending, (state) => {
        state.loadingPost = true;
        state.errorPost = null;
      })
      .addCase(createExamplePost.fulfilled, (state, action) => {
        state.loadingPost = false;
        state.createdPost = action.payload;
        state.posts = [action.payload, ...state.posts];
      })
      .addCase(createExamplePost.rejected, (state, action) => {
        state.loadingPost = false;
        state.errorPost =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Failed to create post" };
      });
  },
});

export const { resetExampleErrors } = exampleSlice.actions;
export default exampleSlice.reducer;
