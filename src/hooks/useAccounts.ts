import { useCallback, useEffect, useRef, useState } from "react";
import { ipc } from "@/lib/ipc";
import type { AccountsSnapshot, UsageState } from "@/types";

interface State {
  data: AccountsSnapshot | null;
  loading: boolean;
  error: string | null;
}

export function useAccounts(pollMs = 30_000) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const mountedRef = useRef(true);
  const inflightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const data = await ipc.listAccounts();
      if (!mountedRef.current) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (!mountedRef.current) return;
      setState((s) => ({ ...s, loading: false, error: String(e) }));
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
    if (pollMs <= 0) {
      return () => {
        mountedRef.current = false;
      };
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs, refresh]);

  return { ...state, refresh, patchUsage };
}
