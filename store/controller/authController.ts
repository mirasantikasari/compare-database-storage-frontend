import api from "@/services/api";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiErrorResponse } from "../types/ApiError";
import {
  ForgotPasswordRequest,
  LoginRequest,
  PayloadRegister,
  ResetPasswordRequest,
} from "../types/AuthType";
import { isAxiosError } from "axios";

function toApiError(error: unknown): ApiErrorResponse {
  if (isAxiosError(error)) {
    return (
      error.response?.data ?? { message: error.message || "Network error" }
    );
  }
  return { message: "Unexpected error" };
}

export const handleActionLogin = createAsyncThunk(
  "/auth/login",
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      const response = (await api.post(`/login`, payload)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const getProfile = createAsyncThunk(
  "/auth/profile",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = (await api.get(`/check-auth`)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const handleActionRegister = createAsyncThunk(
  "/auth/register",
  async (payload: PayloadRegister, { rejectWithValue }) => {
    try {
      const response = (await api.post(`/register`, payload)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const handleRegisterTherapist = createAsyncThunk(
  "/auth/register-therapist",
  async (payload: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = (await api.post(`/register-therapist`, payload)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const handleForgotPassword = createAsyncThunk(
  "/auth/forgot-password",
  async (payload: ForgotPasswordRequest, { rejectWithValue }) => {
    try {
      const response = (await api.post(`/forgot-password`, payload)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const handleResetPassword = createAsyncThunk(
  "/auth/reset-password",
  async (payload: ResetPasswordRequest, { rejectWithValue }) => {
    try {
      const response = (await api.post(`/reset-password`, payload)).data;
      return response;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);
