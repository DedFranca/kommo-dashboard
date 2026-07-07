"use client";

import { useEffect, useState } from "react";

/** Habilita arrastar/redimensionar painéis apenas enquanto Ctrl (ou ⌘) estiver pressionado. */
export function useModifierDragEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = (e: KeyboardEvent | MouseEvent) => {
      setEnabled(e.ctrlKey || e.metaKey);
    };
    const reset = () => setEnabled(false);

    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return enabled;
}
