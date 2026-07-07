"use client";

import { useEffect, useState } from "react";

function layoutCssHealthy(): boolean {
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')] as HTMLLinkElement[];
  const layoutLink = links.find((l) => l.href.includes("/app/layout.css"));
  if (!layoutLink?.sheet) return false;
  try {
    return layoutLink.sheet.cssRules.length > 50;
  } catch {
    return false;
  }
}

export function CssHealthMonitor() {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!layoutCssHealthy()) setBroken(true);
  }, []);

  if (process.env.NODE_ENV !== "development" || !broken) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-md">
      <p className="font-semibold">Estilos do dashboard não carregaram.</p>
      <p className="mt-1">
        Pare o servidor, execute <code className="rounded bg-amber-100 px-1">npm run dev:clean</code> e
        abra a URL correta (ex.: http://localhost:3001). Não misture{" "}
        <code className="rounded bg-amber-100 px-1">npm run build</code> com{" "}
        <code className="rounded bg-amber-100 px-1">npm run dev</code> ao mesmo tempo.
      </p>
    </div>
  );
}
