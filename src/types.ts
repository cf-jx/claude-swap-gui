export interface Bucket {
  pct: number;
  countdown: string;
  clock: string;
}

export interface Usage {
  five_hour: Bucket | null;
  seven_day: Bucket | null;
}

export type UsageState =
  | { status: "ok"; five_hour: Bucket | null; seven_day: Bucket | null }
  | { status: "no_credentials" }
  | { status: "unavailable"; message: string };

export interface Account {
  slot: number;
  email: string;
  organization_name: string;
  organization_uuid: string;
  is_active: boolean;
  usage: UsageState;
}

export interface TokenTotals {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  message_count: number;
  files_scanned: number;
  total_cost_usd: number;
}

export interface AccountsSnapshot {
  accounts: Account[];
  active_email: string | null;
  active_slot: number | null;
  token_totals: TokenTotals;
  empty: boolean;
  no_active_login: boolean;
}

export interface BackupSummary {
  path: string;
  accounts: number;
  credentials: number;
  configs: number;
  missing_credentials: number;
  missing_configs: number;
}
