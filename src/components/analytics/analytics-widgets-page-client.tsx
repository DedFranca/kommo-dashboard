"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { CreatePresetDialog } from "@/components/dashboard/create-preset-dialog";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { ImportDatasetDialog } from "@/components/dashboard/import-dataset-dialog";
import { AnalyticsCanvasHeader } from "@/components/analytics/analytics-canvas-header";
import { DataSourcesBar } from "@/components/analytics/data-sources-bar";
import { SharePresetDialog } from "@/components/analytics/share-preset-dialog";
import { LayoutSelector } from "@/components/dashboard/layout-selector";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { WidgetConfigPanel } from "@/components/dashboard/widget-config/widget-config-panel";
import { Button } from "@/components/ui/button";
import { useAnalyticsPresets } from "@/hooks/use-analytics-presets";
import { useDataSources } from "@/hooks/use-data-sources";
import { getWidgetQueryConfig } from "@/types/widget-query";
import { DATA_SOURCE_TYPE_ICONS } from "@/types/data-source-registry";
import { formatRangeLabel, getDefaultDateRange, type DateRange } from "@/lib/date-range";
import {
  appendWidgetToLayout,
  duplicateWidgetInLayout,
  removeWidgetFromLayout,
} from "@/lib/layout-widgets";
import { createNewWidget, createWidgetFromTemplate, type WidgetTemplate } from "@/lib/widget-factory";
import { BuilderShell, useAutoSave, useBuilderState } from "@/modules/dashboard-builder";
import { EMPTY_ANALYTICS_LAYOUT } from "@/types/analytics-layout";
import type { AnalyticsPresetsCollection } from "@/types/analytics-presets";
import type { DashboardWidget, WidgetType } from "@/types/dashboard-layout";
import type { ResolvedPermissions } from "@/types/user-permissions";

const ResponsiveGridLayout = dynamic(
  async () => {
    const mod = await import("react-grid-layout");
    const Responsive = mod.Responsive ?? mod.default?.Responsive;
    const WidthProvider = mod.WidthProvider ?? mod.default?.WidthProvider;
    if (!WidthProvider || !Responsive) throw new Error("react-grid-layout export shape not supported");
    return WidthProvider(Responsive);
  },
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" /> },
);

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

type Props = {
  initialPresets: AnalyticsPresetsCollection;
  permissions: ResolvedPermissions;
};

export function AnalyticsWidgetsPageClient({ initialPresets, permissions }: Props) {
  const [range, setRange] = useState<DateRange>(() => getDefaultDateRange());
  const periodLabel = useMemo(() => formatRangeLabel(range.from, range.to), [range]);
  const { refresh: refreshDataSources } = useDataSources();

  const canEdit = permissions.canEditDashboard;
  const canShare = permissions.canShareLayouts;

  const {
    presets,
    activePresetId,
    state,
    dirty,
    saving,
    error,
    onLayoutChange,
    applyAndPersist,
    saveActive,
    selectPreset,
    createPreset,
    deletePreset,
    shareActive,
  } = useAnalyticsPresets(initialPresets, { readOnly: !canEdit });

  const [shareOpen, setShareOpen] = useState(false);
  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? null,
    [presets, activePresetId],
  );

  const { sources: dataSources } = useDataSources();
  const sourceLabelFor = useCallback(
    (widget: DashboardWidget): { icon: string; label: string } | null => {
      const config = getWidgetQueryConfig(widget);
      const source = config.source;
      if (!source) return null;
      if (source.kind === "kommo") return { icon: DATA_SOURCE_TYPE_ICONS.kommo, label: "Kommo" };
      if (source.kind === "dataset") {
        const match = dataSources.find((s) => s.id === source.datasetId);
        return {
          icon: DATA_SOURCE_TYPE_ICONS[match?.type ?? "csv"],
          label: match?.name ?? "Dataset",
        };
      }
      return null;
    },
    [dataSources],
  );

  const [importOpen, setImportOpen] = useState(false);
  const [dataSourcesRefresh, setDataSourcesRefresh] = useState(0);
  const [createPresetOpen, setCreatePresetOpen] = useState(false);

  const {
    mode: builderMode,
    setMode: setBuilderMode,
    selectedWidgetId,
    selectWidget,
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    snapToGrid,
    toggleSnapToGrid,
    isEditing,
  } = useBuilderState("view");

  const layoutEditable = canEdit && isEditing;

  const layouts: Layouts = useMemo(() => state.layouts, [state.layouts]);

  const clearCanvas = useCallback(() => {
    if (!confirm("Limpar todos os widgets deste layout?")) return;
    applyAndPersist(structuredClone(EMPTY_ANALYTICS_LAYOUT));
    selectWidget(null);
  }, [applyAndPersist, selectWidget]);

  useAutoSave(
    state,
    async () => {
      if (!canEdit || !isEditing) return;
      await saveActive();
    },
    { enabled: canEdit && isEditing, dirty, delayMs: 2500 },
  );

  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      await selectPreset(presetId);
      selectWidget(null);
    },
    [selectPreset, selectWidget],
  );

  const handleDeletePreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!confirm(`Apagar o layout "${preset?.name ?? ""}"? Esta ação não pode ser desfeita.`)) return;
      void deletePreset(presetId);
      selectWidget(null);
    },
    [presets, deletePreset, selectWidget],
  );

  const handleCreatePreset = useCallback(
    async (input: { name: string; description?: string }) => {
      await createPreset({ name: input.name, description: input.description });
      selectWidget(null);
      setBuilderMode("edit");
    },
    [createPreset, selectWidget, setBuilderMode],
  );

  const updateWidget = useCallback(
    (widgetId: string, updated: DashboardWidget) => {
      applyAndPersist({
        ...state,
        widgets: state.widgets.map((w) => (w.id === widgetId ? updated : w)),
      });
    },
    [state, applyAndPersist],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      if (selectedWidgetId === widgetId) selectWidget(null);
      applyAndPersist(removeWidgetFromLayout(state, widgetId));
    },
    [state, applyAndPersist, selectedWidgetId, selectWidget],
  );

  const addWidgetFromLibrary = useCallback(
    (type: WidgetType, label: string) => {
      const widget = createNewWidget({ type, title: label });
      applyAndPersist(appendWidgetToLayout(state, widget));
      selectWidget(widget.id);
      if (!isEditing) setBuilderMode("edit");
    },
    [state, applyAndPersist, selectWidget, isEditing, setBuilderMode],
  );

  const addWidgetFromTemplate = useCallback(
    (template: WidgetTemplate) => {
      const widget = createWidgetFromTemplate(template);
      applyAndPersist(appendWidgetToLayout(state, widget));
      selectWidget(widget.id);
      if (!isEditing) setBuilderMode("edit");
    },
    [state, applyAndPersist, selectWidget, isEditing, setBuilderMode],
  );

  const enterEditMode = useCallback(() => setBuilderMode("edit"), [setBuilderMode]);

  const duplicateSelectedWidget = useCallback(() => {
    if (!selectedWidgetId) return;
    const next = duplicateWidgetInLayout(state, selectedWidgetId);
    if (!next) return;
    const newWidget = next.widgets[next.widgets.length - 1];
    applyAndPersist(next);
    if (newWidget) selectWidget(newWidget.id);
  }, [state, selectedWidgetId, applyAndPersist, selectWidget]);

  const selectedWidget = useMemo(
    () => state.widgets.find((w) => w.id === selectedWidgetId) ?? null,
    [state.widgets, selectedWidgetId],
  );

  const updateCanvasTitle = useCallback(
    (title: string) => {
      const trimmed = title.trim();
      applyAndPersist({
        ...state,
        canvasTitle: trimmed || undefined,
      });
    },
    [state, applyAndPersist],
  );

  const isEmpty = state.widgets.length === 0;

  return (
    <div className="space-y-3 px-4 py-3 sm:px-6 lg:px-8">
      {!canEdit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Modo somente leitura — seu papel não permite editar painéis ou layout.
        </p>
      ) : null}
      <DashboardToolbar
        title="Analytics — painéis personalizáveis"
        periodLabel={periodLabel}
        dateRange={range}
        onDateRangeChange={setRange}
        onEnterEditMode={canEdit ? enterEditMode : undefined}
        isEditing={isEditing}
        onResetLayout={canEdit ? clearCanvas : undefined}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <LayoutSelector
            presets={presets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onCreatePreset={canEdit ? () => setCreatePresetOpen(true) : undefined}
            onDeletePreset={canEdit ? handleDeletePreset : undefined}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {canEdit
              ? isEditing
                ? "Modo edição — arraste widgets e configure no painel direito"
                : "Modo visualização — clique em Edição para alterar o layout"
              : "Visualização apenas — alterações de layout desabilitadas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
          {dirty ? <span className="text-xs text-amber-600">Alterações não salvas</span> : null}
          {canEdit ? (
            <Button type="button" onClick={() => void saveActive()} disabled={!dirty || saving}>
              {saving ? "Salvando…" : "Salvar layout"}
            </Button>
          ) : null}
          {canShare && activePreset ? (
            <Button type="button" variant="outline" onClick={() => setShareOpen(true)}>
              Compartilhar
              {activePreset.sharedViewerIds && activePreset.sharedViewerIds.length > 0
                ? ` (${activePreset.sharedViewerIds.length})`
                : ""}
            </Button>
          ) : null}
        </div>
      </div>

      {shareOpen && activePreset ? (
        <SharePresetDialog
          presetName={activePreset.name}
          currentViewerIds={activePreset.sharedViewerIds ?? []}
          onClose={() => setShareOpen(false)}
          onShare={shareActive}
        />
      ) : null}

      <DataSourcesBar
        refreshSignal={dataSourcesRefresh}
        canImport={permissions.canImportData}
        onImportClick={() => setImportOpen(true)}
        readOnly={!canEdit}
      />

      <BuilderShell
        mode={builderMode}
        onModeChange={setBuilderMode}
        canEdit={canEdit}
        dirty={dirty}
        saving={saving}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={toggleLeftPanel}
        onToggleRightPanel={toggleRightPanel}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={toggleSnapToGrid}
        onAddWidget={addWidgetFromLibrary}
        onAddTemplate={addWidgetFromTemplate}
        configPanel={
          canEdit && isEditing ? (
            <WidgetConfigPanel
              widget={selectedWidget}
              dateRange={range}
              onUpdate={(updated) => updateWidget(updated.id, updated)}
              onDuplicate={duplicateSelectedWidget}
              onRemove={() => selectedWidgetId && removeWidget(selectedWidgetId)}
              onClose={toggleRightPanel}
            />
          ) : null
        }
      >
        <AnalyticsCanvasHeader
          title={state.canvasTitle}
          editable={canEdit && isEditing}
          onTitleChange={updateCanvasTitle}
        />
        {isEmpty ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/60 p-8 text-center dark:bg-slate-950/40">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Layout vazio</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {canEdit
                ? "Entre em modo Edição e use o painel da esquerda para adicionar widgets (KPI, gráficos, tabelas). Depois escolha a fonte de dados em cada um."
                : "Nenhum widget neste layout ainda."}
            </p>
            {canEdit ? (
              <div className="mt-4 flex gap-2">
                {!isEditing ? (
                  <Button type="button" onClick={enterEditMode}>
                    Entrar em modo edição
                  </Button>
                ) : (
                  <Button type="button" onClick={() => addWidgetFromLibrary("kpi", "Novo KPI")}>
                    + Adicionar um KPI
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <ResponsiveGridLayout
            className="min-h-[680px]"
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={32}
            margin={[10, 10]}
            containerPadding={[4, 4]}
            draggableHandle=".drag-handle"
            draggableCancel=".widget-no-drag, .widget-no-drag *"
            isDraggable={layoutEditable}
            isResizable={layoutEditable}
            onLayoutChange={layoutEditable ? onLayoutChange : undefined}
            compactType="vertical"
            preventCollision={false}
          >
            {state.widgets.map((w) => (
              <div
                key={w.id}
                role="button"
                tabIndex={isEditing ? 0 : -1}
                onClick={() => isEditing && selectWidget(w.id)}
                onKeyDown={(e) => {
                  if (isEditing && (e.key === "Enter" || e.key === " ")) selectWidget(w.id);
                }}
                className={`overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-950 ${
                  selectedWidgetId === w.id && isEditing
                    ? "border-indigo-500 ring-2 ring-indigo-500/30"
                    : "border-border"
                }`}
              >
                <div
                  className={`drag-handle flex items-center justify-between border-b border-border bg-slate-50 px-2 py-1.5 dark:bg-slate-900 ${
                    layoutEditable ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                >
                  <span className="widget-no-drag truncate text-[10px] font-medium uppercase tracking-wide text-slate-400 cursor-default">
                    {w.title}
                  </span>
                  {(() => {
                    const badge = sourceLabelFor(w);
                    if (!badge) {
                      return (
                        <span className="widget-no-drag ml-2 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          sem fonte
                        </span>
                      );
                    }
                    return (
                      <span
                        className="widget-no-drag ml-2 inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        title={`Fonte: ${badge.label}`}
                      >
                        <span>{badge.icon}</span>
                        <span className="max-w-[90px] truncate">{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="h-[calc(100%-28px)] min-h-0 overflow-hidden p-1">
                  <WidgetRenderer
                    widget={w}
                    dateRange={range}
                    dataOwnerId={activePreset?.dataOwnerId}
                  />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </BuilderShell>

      {permissions.canImportData ? (
        <ImportDatasetDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setDataSourcesRefresh((n) => n + 1);
            void refreshDataSources();
          }}
        />
      ) : null}

      {canEdit ? (
        <CreatePresetDialog
          isOpen={createPresetOpen}
          currentLayout={state}
          onClose={() => setCreatePresetOpen(false)}
          onSave={async (preset) => {
            await handleCreatePreset({ name: preset.name, description: preset.description });
          }}
        />
      ) : null}
    </div>
  );
}
