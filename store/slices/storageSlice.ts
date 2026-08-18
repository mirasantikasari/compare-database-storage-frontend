import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  getBuckets,
  getProviders,
  getStorageSummary,
  runReconciliation,
} from "../controller/storageController";
import type {
  ReconciliationResult,
  ReconciliationSummary,
  StorageProvider,
  StorageSummary,
} from "../types/StorageType";
import type { ApiErrorResponse } from "../types/ApiError";

export interface SummaryProgress {
  completed: number;
  total: number;
  percent: number;
  bucket: string;
  error?: string;
  reportFile?: string;
}

export interface AutoReconciliationProgress {
  phase: "discovering" | "database" | "storage";
  completed: number;
  total: number;
  percent: number;
  label: string;
  mappingCount?: number;
}

export interface AutoReconciliationResult {
  summary: ReconciliationSummary;
  mappings: number;
  reportFile: string;
}

interface StorageState {
  providers: StorageProvider[];
  loadingProviders: boolean;
  errorProviders: ApiErrorResponse | null;
  selectedProvider: string;

  buckets: string[];
  bucketCount: number;
  loadingBuckets: boolean;
  errorBuckets: ApiErrorResponse | null;

  summary: StorageSummary | null;
  loadingSummary: boolean;
  errorSummary: ApiErrorResponse | null;
  summaryProgress: SummaryProgress | null;

  reconciliation: ReconciliationResult | null;
  loadingReconciliation: boolean;
  errorReconciliation: ApiErrorResponse | null;

  autoReconciliation: AutoReconciliationResult | null;
  loadingAutoReconciliation: boolean;
  errorAutoReconciliation: ApiErrorResponse | null;
  autoReconciliationProgress: AutoReconciliationProgress | null;
}

const initialState: StorageState = {
  providers: [],
  loadingProviders: false,
  errorProviders: null,
  selectedProvider: "",

  buckets: [],
  bucketCount: 0,
  loadingBuckets: false,
  errorBuckets: null,

  summary: null,
  loadingSummary: false,
  errorSummary: null,
  summaryProgress: null,

  reconciliation: null,
  loadingReconciliation: false,
  errorReconciliation: null,

  autoReconciliation: null,
  loadingAutoReconciliation: false,
  errorAutoReconciliation: null,
  autoReconciliationProgress: null,
};

const storageSlice = createSlice({
  name: "storage",
  initialState,
  reducers: {
    providerSelected(state, action: PayloadAction<string>) {
      state.selectedProvider = action.payload;
    },

    summaryStreamStarted(state) {
      state.loadingSummary = true;
      state.errorSummary = null;
      state.summaryProgress = null;
    },
    summaryStreamProgress(state, action: PayloadAction<SummaryProgress>) {
      state.summaryProgress = action.payload;
    },
    summaryStreamSucceeded(state, action: PayloadAction<StorageSummary>) {
      state.loadingSummary = false;
      state.summary = action.payload;
      state.summaryProgress = null;
    },
    summaryStreamFailed(state, action: PayloadAction<string>) {
      state.loadingSummary = false;
      state.errorSummary = { message: action.payload };
      state.summaryProgress = null;
    },

    autoReconciliationStreamStarted(state) {
      state.loadingAutoReconciliation = true;
      state.errorAutoReconciliation = null;
      state.autoReconciliationProgress = null;
    },
    autoReconciliationStreamProgress(state, action: PayloadAction<AutoReconciliationProgress>) {
      state.autoReconciliationProgress = action.payload;
    },
    autoReconciliationStreamSucceeded(state, action: PayloadAction<AutoReconciliationResult>) {
      state.loadingAutoReconciliation = false;
      state.autoReconciliation = action.payload;
      state.autoReconciliationProgress = null;
    },
    autoReconciliationStreamFailed(state, action: PayloadAction<string>) {
      state.loadingAutoReconciliation = false;
      state.errorAutoReconciliation = { message: action.payload };
      state.autoReconciliationProgress = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProviders.pending, (state) => {
        state.loadingProviders = true;
        state.errorProviders = null;
      })
      .addCase(getProviders.fulfilled, (state, action) => {
        state.loadingProviders = false;
        state.providers = action.payload;
        if (!state.selectedProvider) {
          state.selectedProvider =
            action.payload.find((p) => p.isDefault)?.key ?? action.payload[0]?.key ?? "";
        }
      })
      .addCase(getProviders.rejected, (state, action) => {
        state.loadingProviders = false;
        state.errorProviders =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Failed to load providers" };
      })

      .addCase(getBuckets.pending, (state) => {
        state.loadingBuckets = true;
        state.errorBuckets = null;
      })
      .addCase(getBuckets.fulfilled, (state, action) => {
        state.loadingBuckets = false;
        state.buckets = action.payload.buckets;
        state.bucketCount = action.payload.count;
      })
      .addCase(getBuckets.rejected, (state, action) => {
        state.loadingBuckets = false;
        state.errorBuckets =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Failed to load buckets" };
      })

      .addCase(getStorageSummary.pending, (state) => {
        state.loadingSummary = true;
        state.errorSummary = null;
      })
      .addCase(getStorageSummary.fulfilled, (state, action) => {
        state.loadingSummary = false;
        state.summary = action.payload;
      })
      .addCase(getStorageSummary.rejected, (state, action) => {
        state.loadingSummary = false;
        state.errorSummary =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Failed to load summary" };
      })

      .addCase(runReconciliation.pending, (state) => {
        state.loadingReconciliation = true;
        state.errorReconciliation = null;
      })
      .addCase(runReconciliation.fulfilled, (state, action) => {
        state.loadingReconciliation = false;
        state.reconciliation = action.payload;
      })
      .addCase(runReconciliation.rejected, (state, action) => {
        state.loadingReconciliation = false;
        state.errorReconciliation =
          (action.payload as ApiErrorResponse) ??
          { message: action.error.message ?? "Reconciliation failed" };
      });
  },
});

export const {
  providerSelected,
  summaryStreamStarted,
  summaryStreamProgress,
  summaryStreamSucceeded,
  summaryStreamFailed,
  autoReconciliationStreamStarted,
  autoReconciliationStreamProgress,
  autoReconciliationStreamSucceeded,
  autoReconciliationStreamFailed,
} = storageSlice.actions;

export default storageSlice.reducer;
