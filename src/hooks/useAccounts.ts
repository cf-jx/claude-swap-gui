import { useCallback, useEffect, useRef, useState } from "react";
import { ipc } from "@/lib/ipc";
import type { AccountsSnapshot, UsageState } from "@/types";

interface State {
  data: AccountsSnapshot | null;
  loading: boolean;
  error: string | null;
}

export function useAccounts() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);
  const inflightRef = useRef(false);

  const refresh = useCallback(async (): Promise<AccountsSnapshot | null> => {
    if (inflightRef.current) return null;
    inflightRef.current = true;
    try {
      const data = await ipc.listAccounts();
      if (!mountedRef.current) return null;
      // Carry "ok" usage from the previous snapshot forward, so polling
      // refreshes don't briefly flash "unavailable" before the new fetch
      // completes. Slots that have moved or lost ok-state fall through
      // to the fresh default placeholder.
      setState((prev) => {
        const prevOk = new Map(
          (prev.data?.accounts ?? [])
            .filter((a) => a.usage.status === "ok")
            .map((a) => [a.slot, a.usage] as const)
        );
        const merged: AccountsSnapshot = {
          ...data,
          accounts: data.accounts.map((acc) => {
            const carried = prevOk.get(acc.slot);
            return carried ? { ...acc, usage: carried } : acc;
          }),
        };
        return { data: merged, loading: false, error: null };
      });
      return data;
    } catch (e) {
      if (!mountedRef.current) return null;
      setState((s) => ({ ...s, loading: false, error: String(e) }));
      return null;
    } finally {
      inflightRef.current = false;
    }
  }, []);

  /** In-place usage replacement for one account, no full refetch. */
  const patchUsage = useCallback((slot: number, usage: UsageState) => {
    setState((s) => {
      if (!s.data) return s;
      const next = {
        ...s.data,
        accounts: s.data.accounts.map((acc) =>
          acc.slot === slot ? { ...acc, usage } : acc
        ),
      };
      return { ...s, data: next };
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
    // Polling lives in App.tsx so it can drive the full refresh pipeline
    // (list + fan-out usage), instead of the bare list refresh that left
    // all usage bars stuck at "unavailable" between intervals.
  }, [refresh]);

  return { ...state, refresh, patchUsage };
}
