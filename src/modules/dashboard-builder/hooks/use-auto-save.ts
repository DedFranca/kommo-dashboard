"use client";

import { useEffect, useRef } from "react";

/** Auto-save com debounce para persistência de layout. */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options: { enabled?: boolean; delayMs?: number; dirty?: boolean } = {},
) {
  const { enabled = true, delayMs = 2000, dirty = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    if (!enabled || !dirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void saveFnRef.current(data);
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, dirty, delayMs]);
}
