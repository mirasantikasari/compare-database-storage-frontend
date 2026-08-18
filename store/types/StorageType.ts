export interface BucketSummary {
  bucket: string;
  objectCount: number;
  totalSize: number;
}

export interface StorageSummary {
  buckets: BucketSummary[];
  bucketCount: number;
  objectCount: number;
  totalSize: number;
  reportFile?: string;
}

export interface StorageSummaryParams {
  buckets?: string;
  prefix?: string;
  exportReport?: boolean;
}

export interface TableColumnMapping {
  table: string;
  column: string;
  idColumn?: string;
}

export interface ReconciliationRequest {
  buckets?: string[];
  prefix?: string;
  mappings: TableColumnMapping[];
  database?: string;
  provider?: string;
}

export interface StorageProvider {
  key: string;
  label: string;
  isDefault: boolean;
}

export interface ReconciliationSummary {
  matchedCount: number;
  missingCount: number;
  orphanCount: number;
  databaseFileCount: number;
  storageObjectCount: number;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  reportFile: string;
}
