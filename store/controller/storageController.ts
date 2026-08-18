import { isAxiosError } from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/services/api";
import type { ApiErrorResponse } from "../types/ApiError";
import type {
  ReconciliationRequest,
  ReconciliationResult,
  StorageProvider,
  StorageSummary,
  StorageSummaryParams,
} from "../types/StorageType";

function toApiError(error: unknown): ApiErrorResponse {
  if (isAxiosError(error)) {
    return (
      error.response?.data ?? { message: error.message || "Network error" }
    );
  }
  return { message: "Unexpected error" };
}

export const getProviders = createAsyncThunk(
  "storage/getProviders",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await api.get<{ status: boolean; data: { providers: StorageProvider[] } }>(
        "/storage/providers"
      );
      return response.data.data.providers;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const getBuckets = createAsyncThunk(
  "storage/getBuckets",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await api.get<{ status: boolean; data: { buckets: string[]; count: number } }>(
        "/storage/buckets"
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const getStorageSummary = createAsyncThunk(
  "storage/getSummary",
  async (params: StorageSummaryParams, { rejectWithValue }) => {
    try {
      const response = await api.get<{ status: boolean; data: StorageSummary }>(
        "/storage/summary",
        {
          params: {
            buckets: params.buckets || undefined,
            prefix: params.prefix || undefined,
            export: params.exportReport ? "true" : undefined,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);

export const runReconciliation = createAsyncThunk(
  "storage/runReconciliation",
  async (payload: ReconciliationRequest, { rejectWithValue }) => {
    try {
      const response = await api.post<{ status: boolean; data: ReconciliationResult }>(
        "/reconciliation",
        payload
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  }
);
