import { invoke } from "@tauri-apps/api/core";
import type { AccountsSnapshot, UsageState } from "@/types";

export const ipc = {
  listAccounts: () => invoke<AccountsSnapshot>("list_accounts"),
  refreshUsage: (slot: number) => invoke<UsageState>("refresh_usage", { slot }),
  switchNext: () => invoke<string>("switch_next"),
  switchTo: (identifier: string) => invoke<string>("switch_to", { identifier }),
  addCurrent: () => invoke<number>("add_current_account"),
  removeAccount: (identifier: string) => invoke<void>("remove_account", { identifier }),
};
