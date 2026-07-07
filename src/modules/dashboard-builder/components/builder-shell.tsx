"use client";

import type { ReactNode } from "react";
import { BuilderTopBar } from "./builder-top-bar";
import { WidgetLibraryPanel } from "./widget-library-panel";
import type { BuilderMode } from "../types";
import type { WidgetType } from "@/types/dashboard-layout";

type Props = {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  canEdit?: boolean;
  dirty?: boolean;
  saving?: boolean;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  onAddWidget: (type: WidgetType, label: string) => void;
  onAddTemplate: (template: import("@/lib/widget-factory").WidgetTemplate) => void;
  configPanel?: ReactNode;
  children: ReactNode;
};

export function BuilderShell({
  mode,
  onModeChange,
  canEdit,
  dirty,
  saving,
  leftPanelOpen = true,
  rightPanelOpen = true,
  onToggleLeftPanel,
  onToggleRightPanel,
  snapToGrid,
  onToggleSnapToGrid,
  onAddWidget,
  onAddTemplate,
  configPanel,
  children,
}: Props) {
  const isEditing = mode === "edit" && canEdit;

  return (
    <div className="flex flex-col gap-3">
      <BuilderTopBar
        mode={mode}
        onModeChange={onModeChange}
        dirty={dirty}
        saving={saving}
        canEdit={canEdit}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={onToggleLeftPanel}
        onToggleRightPanel={onToggleRightPanel}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={onToggleSnapToGrid}
        autoSaveEnabled
      />

      <div className="flex min-h-[720px] overflow-hidden rounded-xl border border-border bg-slate-100/50 dark:bg-slate-900/50">
        {isEditing && leftPanelOpen ? (
          <WidgetLibraryPanel onAddWidget={onAddWidget} onAddTemplate={onAddTemplate} onClose={onToggleLeftPanel} />
        ) : null}

        <main className="min-w-0 flex-1 overflow-auto p-2">{children}</main>

        {isEditing && rightPanelOpen && configPanel ? configPanel : null}
      </div>
    </div>
  );
}
