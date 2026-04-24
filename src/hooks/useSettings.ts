import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SettingsShape {
  autostart: boolean;
  hotkey: string;
  poll_seconds: number;
  theme: "system" | "light" | "dark";
}

export const POLL_OPTIONS = [300, 600, 900, 1800] as const;

const DEFAULT: SettingsShape = {
  autostart: false,
  hotkey: "CmdOrCtrl+Shift+Backslash",
  poll_seconds: 300,
  theme: "system",
};

export function normalizePollSeconds(value: number): number {
  return POLL_OPTIONS.includes(value as (typeof POLL_OPTIONS)[number])
    ? value
    : POLL_OPTIONS[0];
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsShape>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    invoke<SettingsShape>("get_settings")
      .then((s) => {
        setSettings({
          ...DEFAULT,
          ...s,
          poll_seconds: normalizePollSeconds(s.poll_seconds),
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = useCallback(async (patch: Partial<SettingsShape>) => {
    const next = {
      ...settings,
      ...patch,
      poll_seconds: normalizePollSeconds(patch.poll_seconds ?? settings.poll_seconds),
    } as SettingsShape;
    setSettings(next);
    try {
      await invoke("set_settings", { settings: next });
    } catch (e) {
      console.warn("save settings failed", e);
    }
    return next;
  }, [settings]);

  return { settings, loaded, save };
}
