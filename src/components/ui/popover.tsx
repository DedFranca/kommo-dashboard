"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  className?: string;
};

export function Popover({ anchorRef, open, onClose, children, width = 256, className }: PopoverProps) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: 256 });
  const portalRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = Math.min(width, viewportWidth - 16);
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - popoverWidth / 2), viewportWidth - popoverWidth - 8);
    const below = rect.bottom + 8 + 320 <= viewportHeight;
    const top = below ? rect.bottom + 8 : Math.max(8, rect.top - 8 - 320);
    setStyle({ top, left, width: popoverWidth });
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const content = useMemo(() => {
    if (!open) return null;
    return (
      <>
        <div className="fixed inset-0 z-[100] bg-transparent" onPointerDown={onClose} />
        <div
          className={cn(
            "fixed z-[110] rounded-lg border border-border bg-white p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950",
            className,
          )}
          style={{ top: style.top, left: style.left, width: style.width, position: "fixed" }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </>
    );
  }, [children, className, onClose, open, style.left, style.top, style.width]);

  if (!portalRef.current) {
    portalRef.current = document.createElement("div");
  }

  useEffect(() => {
    const portal = portalRef.current;
    if (!portal) return;
    document.body.appendChild(portal);
    return () => {
      if (portal.parentElement === document.body) {
        document.body.removeChild(portal);
      }
    };
  }, []);

  if (!open) return null;

  return createPortal(content, portalRef.current);
}
