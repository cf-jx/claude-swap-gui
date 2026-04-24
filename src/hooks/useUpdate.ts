import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "uptodate" }
  | { state: "available"; version: string; notes?: string }
  | { state: "downloading"; version: string; downloaded: number; total?: number }
  | { state: "ready"; version: string }
  | { state: "error"; message: string };

export function useUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });
  const [pending, setPending] = useState<Update | null>(null);

  const checkNow = useCallback(async () => {
    setStatus({ state: "checking" });
    try {
      const update = await check();
      if (update) {
        setPending(update);
        setStatus({ state: "available", version: update.version, notes: update.body });
      } else {
        setPending(null);
        setStatus({ state: "uptodate" });
      }
    } catch (e) {
      setStatus({ state: "error", message: String(e).replace(/^Error: /, "") });
    }
  }, []);

  const installNow = useCallback(async () => {
    if (!pending) return;
    const version = pending.version;
    let downloaded = 0;
    let total: number | undefined;
    setStatus({ state: "downloading", version, downloaded: 0 });
    try {
      await pending.downloadAndInstall((evt) => {
        if (evt.event === "Started") {
          total = evt.data.contentLength ?? undefined;
          setStatus({ state: "downloading", version, downloaded: 0, total });
        } else if (evt.event === "Progress") {
          downloaded += evt.data.chunkLength;
          setStatus({ state: "downloading", version, downloaded, total });
        } else if (evt.event === "Finished") {
          setStatus({ state: "ready", version });
        }
      });
      await relaunch();
    } catch (e) {
      setStatus({ state: "error", message: String(e).replace(/^Error: /, "") });
    }
  }, [pending]);

  useEffect(() => {
    void checkNow();
  }, [checkNow]);

  const hasUpdate =
    status.state === "available" ||
    status.state === "downloading" ||
    status.state === "ready";

  return { status, hasUpdate, checkNow, installNow };
}
