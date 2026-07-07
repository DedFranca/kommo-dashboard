"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDataSourceFields, useDataSources } from "@/hooks/use-data-sources";
import { useFieldValues } from "@/hooks/use-field-values";
import type { DateRange } from "@/lib/date-range";
import { formatRangeLabel, toISODate } from "@/lib/date-range";
import type { DashboardWidget } from "@/types/dashboard-layout";
import type { MetricOp } from "@/types/analytics";
import { getMetricDisplayLabel } from "@/types/analytics";
import {
  EMPTY_WIDGET_QUERY,
  getDimensionDisplayLabel,
  getWidgetQueryConfig,
  KPI_FORMAT_LABELS,
  setWidgetQueryConfig,
  normalizeKpiOperand,
  type DateGranularity,
  type KpiCompareConfig,
  type KpiOperand,
  type KpiRatioConfig,
  type WidgetFilter,
  type WidgetDataSource,
  type WidgetQueryConfig,
} from "@/types/widget-query";

const KOMMO_DEFAULT_METRIC: WidgetQueryConfig["metrics"] = [
  { op: "countDistinct", column: "ID", as: "value", label: "Leads" },
];
import { DATE_GRANULARITY_LABELS } from "@/lib/analytics/aggregate/time-bucket";

type Props = {
  widget: DashboardWidget | null;
  dateRange: DateRange;
  onUpdate: (widget: DashboardWidget) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onImportCsv?: () => void;
  onClose?: () => void;
};

const METRIC_OPS: { value: MetricOp; label: string }[] = [
  { value: "count", label: "Contagem" },
  { value: "countDistinct", label: "Contagem distinta" },
  { value: "sum", label: "Soma" },
  { value: "avg", label: "Média" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
];

export function WidgetConfigPanel({
  widget,
  dateRange,
  onUpdate,
  onDuplicate,
  onRemove,
  onImportCsv,
  onClose,
}: Props) {
  const { sources, kommoConfigured, refresh: refreshSources } = useDataSources();
  const [localConfig, setLocalConfig] = useState<WidgetQueryConfig>(EMPTY_WIDGET_QUERY);
  const [localTitle, setLocalTitle] = useState("");

  useEffect(() => {
    if (!widget) return;
    setLocalConfig(getWidgetQueryConfig(widget));
    setLocalTitle(widget.title);
  }, [widget?.id, widget?.title, widget?.props]);

  const { dimensions, metrics: metricFields, loading: fieldsLoading } = useDataSourceFields(localConfig.source);

  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "active"),
    [sources],
  );

  const sourceLabel = useMemo(() => {
    const source = localConfig.source;
    if (!source) return null;
    if (source.kind === "kommo") return "Kommo CRM — Leads";
    if (source.kind === "dataset") {
      const match = sources.find((s) => s.id === source.datasetId);
      return match ? match.name : "Dataset importado";
    }
    return null;
  }, [localConfig.source, sources]);

  const selectedDimField = useMemo(
    () => dimensions.find((d) => d.name === localConfig.dimensions[0]),
    [dimensions, localConfig.dimensions],
  );
  const dimIsTime = selectedDimField?.role === "time" || selectedDimField?.logicalType === "date";

  const dateFieldOptions = useMemo<{ name: string; label: string }[]>(() => {
    const base = dimensions
      .filter((d) => d.role === "time" || d.logicalType === "date")
      .map((d) => ({ name: d.name, label: d.label }));
    if (localConfig.source?.kind === "kommo") {
      const names = new Set(base.map((b) => b.name));
      const extras = [
        { name: "Data_Criacao", label: "Data de criação" },
        { name: "Data_Fechamento", label: "Data de fechamento" },
      ].filter((e) => !names.has(e.name));
      return [...base, ...extras];
    }
    return base;
  }, [dimensions, localConfig.source]);

  const applyChanges = useCallback(
    (config: WidgetQueryConfig, title?: string) => {
      if (!widget) return;
      const next = setWidgetQueryConfig({ ...widget, title: title ?? localTitle }, config);
      onUpdate(next);
    },
    [widget, localTitle, onUpdate],
  );

  const updateConfig = useCallback(
    (patch: Partial<WidgetQueryConfig>) => {
      const next = { ...localConfig, ...patch };
      setLocalConfig(next);
      applyChanges(next);
    },
    [localConfig, applyChanges],
  );

  const handleSourceChange = (value: string) => {
    // Semeia uma métrica de contagem por padrão para que KPIs e gráficos
    // já mostrem resultado assim que a fonte é escolhida (antes ficava vazio
    // porque "Contagem" aparecia selecionado mas nunca era aplicado).
    const defaultMetrics = KOMMO_DEFAULT_METRIC;
    if (value === "kommo") {
      updateConfig({
        source: { kind: "kommo" },
        dimensions: [],
        metrics: defaultMetrics,
        filters: [],
        preset: undefined,
        dateRange: { mode: "inherit" },
      });
    } else if (value.startsWith("dataset:")) {
      updateConfig({
        source: { kind: "dataset", datasetId: value.replace("dataset:", "") },
        dimensions: [],
        metrics: defaultMetrics,
        filters: [],
        preset: undefined,
        dateRange: { mode: "inherit" },
      });
    }
  };

  const sourceValue = useMemo(() => {
    if (!localConfig.source) return "";
    if (localConfig.source.kind === "kommo") return "kommo";
    if (localConfig.source.kind === "dataset") return `dataset:${localConfig.source.datasetId}`;
    return "";
  }, [localConfig.source]);

  const addFilter = () => {
    const field = dimensions[0]?.name ?? "";
    updateConfig({
      filters: [...localConfig.filters, { field, operator: "eq", value: "" }],
    });
  };

  const updateFilter = (index: number, patch: Partial<WidgetFilter>) => {
    const filters = localConfig.filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    updateConfig({ filters });
  };

  const removeFilter = (index: number) => {
    updateConfig({ filters: localConfig.filters.filter((_, i) => i !== index) });
  };

  if (!widget) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-white dark:bg-slate-950/90">
        <PanelHeader onClose={onClose} />
        <div className="flex-1 p-4">
          <p className="text-xs text-slate-500">
            Selecione um widget no canvas para configurar fonte de dados, métricas, dimensões e filtros.
          </p>
        </div>
      </aside>
    );
  }

  const isCohort = widget.type === "cohortChart";
  const isKpi = widget.type === "kpi";
  const isTable = widget.type === "rankingTable" || widget.type === "cohortTable";
  const needsDimension = ["lineChart", "barChart", "areaChart", "pieChart", "rankingTable", "cohortTable"].includes(
    widget.type,
  );

  const numericFields = [...metricFields, ...dimensions.filter((d) => d.logicalType === "number")];
  const filterFields = [...dimensions, ...metricFields].map((f) => ({ name: f.name, label: f.label }));
  const extraMetrics = localConfig.metrics.slice(1);

  const ratio: KpiRatioConfig = {
    enabled: localConfig.kpiRatio?.enabled ?? false,
    numerator: normalizeKpiOperand(localConfig.kpiRatio?.numerator),
    denominator: normalizeKpiOperand(localConfig.kpiRatio?.denominator),
    asPercent: localConfig.kpiRatio?.asPercent ?? true,
  };
  const setRatioMode = (enabled: boolean) =>
    updateConfig({
      kpiRatio: {
        enabled,
        numerator: ratio.numerator,
        denominator: ratio.denominator,
        asPercent: ratio.asPercent,
      },
    });
  const patchRatio = (patch: Partial<KpiRatioConfig>) =>
    updateConfig({ kpiRatio: { ...ratio, ...patch, enabled: true } });

  const compare: KpiCompareConfig = localConfig.compare ?? { enabled: false };
  const patchCompare = (patch: Partial<KpiCompareConfig>) =>
    updateConfig({ compare: { ...compare, ...patch } });

  const setPrimaryMetric = (m: MetricOp, column?: string) => {
    updateConfig({
      preset: undefined,
      metrics: [{ op: m, column: m === "count" ? undefined : column, as: "value", label: localConfig.metrics[0]?.label }, ...extraMetrics],
    });
  };

  const addExtraMetric = () => {
    updateConfig({ metrics: [...localConfig.metrics, { op: "count" }] });
  };

  const updatePrimaryMetricLabel = (label: string) => {
    const current = localConfig.metrics[0] ?? { op: "count" as const, as: "value" };
    updateConfig({
      metrics: [{ ...current, label: label || undefined }, ...extraMetrics],
    });
  };

  const updateExtraMetric = (index: number, patch: { op?: MetricOp; column?: string; label?: string }) => {
    const metrics = localConfig.metrics.map((m, i) => {
      if (i !== index + 1) return m;
      const next = { ...m, ...patch };
      if (next.op === "count") next.column = undefined;
      return next;
    });
    updateConfig({ metrics });
  };

  const removeExtraMetric = (index: number) => {
    updateConfig({ metrics: localConfig.metrics.filter((_, i) => i !== index + 1) });
  };

  const dimLabel = (name: string) =>
    getDimensionDisplayLabel(name, localConfig.dimensionLabels, dimensions);

  const updateDimensionLabel = (dimName: string, label: string | undefined) => {
    const next = { ...(localConfig.dimensionLabels ?? {}) };
    if (label?.trim()) next[dimName] = label.trim();
    else delete next[dimName];
    updateConfig({ dimensionLabels: Object.keys(next).length ? next : undefined });
  };
  const orderMetricOptions: { value: string; label: string }[] = [{ value: "value", label: "Métrica principal" }];
  localConfig.metrics.slice(1).forEach((m, i) => {
    const key = m.as ?? (m.op === "count" ? `count_${i + 1}` : `${m.op}_${m.column ?? i + 1}`);
    orderMetricOptions.push({ value: key, label: getMetricDisplayLabel(m) });
  });

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-white dark:bg-slate-950/90">
      <PanelHeader onClose={onClose} />

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <Section title="Geral">
          <label className="mb-1 block text-[10px] font-medium text-slate-400">Título</label>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => applyChanges(localConfig, localTitle)}
            className="text-sm"
          />
        </Section>

        <Section title="Fonte de dados">
          {sourceLabel ? (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {sourceLabel}
            </div>
          ) : null}
          <select
            className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
            value={sourceValue}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            <option value="">Selecione uma fonte…</option>
            {kommoConfigured ? <option value="kommo">Kommo CRM — Leads</option> : null}
            {activeSources
              .filter((s) => s.kind === "dataset")
              .map((s) => (
                <option key={s.id} value={`dataset:${s.id}`}>
                  {s.type === "google_sheets" ? "Sheets" : "CSV"} — {s.name}
                </option>
              ))}
          </select>
          {!kommoConfigured && activeSources.filter((s) => s.kind === "dataset").length === 0 ? (
            <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
              Configure o Kommo no servidor ou importe um CSV para conectar dados.
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            {onImportCsv ? (
              <Button type="button" variant="outline" className="flex-1 text-[10px] px-2 py-1" onClick={onImportCsv}>
                Importar dados
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="text-[10px] px-2 py-1" onClick={() => void refreshSources()}>
              Atualizar
            </Button>
          </div>
        </Section>

        {localConfig.source && !isCohort ? (
          <>
            {!isKpi ? (
              <Section title={isTable ? "Coluna principal (dimensão)" : "Dimensão"}>
                {fieldsLoading ? (
                  <p className="text-[10px] text-slate-400">Carregando campos…</p>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                      value={localConfig.dimensions[0] ?? ""}
                      onChange={(e) =>
                        updateConfig({ dimensions: e.target.value ? [e.target.value] : [], preset: undefined })
                      }
                    >
                      <option value="">{needsDimension ? "Selecione…" : "Nenhuma"}</option>
                      {dimensions.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    {localConfig.dimensions[0] ? (
                      <MetricLabelField
                        value={localConfig.dimensionLabels?.[localConfig.dimensions[0]] ?? ""}
                        placeholder={dimensions.find((d) => d.name === localConfig.dimensions[0])?.label ?? localConfig.dimensions[0]}
                        onChange={(label) => updateDimensionLabel(localConfig.dimensions[0]!, label || undefined)}
                        hint={isTable ? "Nome exibido no cabeçalho da coluna" : "Rótulo da dimensão nos gráficos"}
                      />
                    ) : null}
                  </div>
                )}
              </Section>
            ) : null}

            {dimIsTime ? (
              <Section title="Agrupar datas por">
                <select
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                  value={localConfig.dateGranularity ?? "month"}
                  onChange={(e) => updateConfig({ dateGranularity: e.target.value as DateGranularity })}
                >
                  {(Object.keys(DATE_GRANULARITY_LABELS) as DateGranularity[]).map((g) => (
                    <option key={g} value={g}>
                      {DATE_GRANULARITY_LABELS[g]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  {isTable
                    ? "Agrupa linhas da tabela por dia, semana, mês ou ano."
                    : "Datas viram períodos (ex.: por mês), evitando milhares de pontos."}
                </p>
              </Section>
            ) : null}

            {isTable ? (
              <Section title="Coluna secundária (opcional)">
                <div className="space-y-2">
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                    value={localConfig.secondaryDimension ?? ""}
                    onChange={(e) => updateConfig({ secondaryDimension: e.target.value || undefined })}
                  >
                    <option value="">Nenhuma</option>
                    {dimensions
                      .filter((f) => f.name !== localConfig.dimensions[0])
                      .map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                  </select>
                  {localConfig.secondaryDimension ? (
                    <MetricLabelField
                      value={localConfig.dimensionLabels?.[localConfig.secondaryDimension] ?? ""}
                      placeholder={
                        dimensions.find((d) => d.name === localConfig.secondaryDimension)?.label ??
                        localConfig.secondaryDimension
                      }
                      onChange={(label) =>
                        updateDimensionLabel(localConfig.secondaryDimension!, label || undefined)
                      }
                      hint="Nome exibido no cabeçalho da coluna"
                    />
                  ) : null}
                  <p className="text-[10px] text-slate-400">Agrupa a tabela por uma segunda coluna.</p>
                </div>
              </Section>
            ) : null}

            {isKpi && ratio.enabled ? null : (
              <Section title={isTable ? "Métrica principal" : "Métrica"}>
                <div className="space-y-2">
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                    value={localConfig.metrics[0]?.op ?? "count"}
                    onChange={(e) => setPrimaryMetric(e.target.value as MetricOp, localConfig.metrics[0]?.column)}
                  >
                    {METRIC_OPS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {localConfig.metrics[0]?.op && localConfig.metrics[0].op !== "count" ? (
                    <select
                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                      value={localConfig.metrics[0]?.column ?? ""}
                      onChange={(e) => setPrimaryMetric(localConfig.metrics[0]!.op, e.target.value)}
                    >
                      <option value="">Campo numérico…</option>
                      {numericFields.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <MetricLabelField
                    value={localConfig.metrics[0]?.label ?? ""}
                    placeholder={
                      localConfig.metrics[0]
                        ? getMetricDisplayLabel({ ...localConfig.metrics[0], label: undefined })
                        : "Contagem"
                    }
                    onChange={updatePrimaryMetricLabel}
                    hint={isTable ? "Nome exibido no cabeçalho da coluna" : "Rótulo da métrica nos gráficos"}
                  />
                </div>
              </Section>
            )}

            {isTable ? (
              <Section title="Métricas adicionais (colunas)">
                {extraMetrics.map((m, i) => (
                  <div key={i} className="mb-2 space-y-1 rounded border border-border p-2">
                    <div className="flex gap-1">
                      <select
                        className="min-w-0 flex-1 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                        value={m.op}
                        onChange={(e) => updateExtraMetric(i, { op: e.target.value as MetricOp })}
                      >
                        {METRIC_OPS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="text-red-500 text-xs" onClick={() => removeExtraMetric(i)}>
                        ×
                      </button>
                    </div>
                    {m.op !== "count" ? (
                      <select
                        className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                        value={m.column ?? ""}
                        onChange={(e) => updateExtraMetric(i, { column: e.target.value })}
                      >
                        <option value="">Campo numérico…</option>
                        {numericFields.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <MetricLabelField
                      value={m.label ?? ""}
                      placeholder={getMetricDisplayLabel({ ...m, label: undefined })}
                      onChange={(label) => updateExtraMetric(i, { label: label || undefined })}
                      hint="Nome da coluna na tabela"
                      compact
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
                  onClick={addExtraMetric}
                >
                  + Adicionar coluna
                </button>
              </Section>
            ) : null}

            {isKpi ? (
              <Section title="Cálculo do KPI">
                <select
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                  value={ratio.enabled ? "ratio" : "value"}
                  onChange={(e) => setRatioMode(e.target.value === "ratio")}
                >
                  <option value="value">Valor único (métrica acima)</option>
                  <option value="ratio">Divisão / Taxa (numerador ÷ denominador)</option>
                </select>

                {ratio.enabled ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-slate-500">Numerador (em cima)</p>
                      <OperandEditor
                        operand={ratio.numerator}
                        fields={filterFields}
                        numericFields={numericFields}
                        source={localConfig.source}
                        dateRange={dateRange}
                        onChange={(op) => patchRatio({ numerator: op })}
                      />
                    </div>
                    <div className="text-center text-sm text-slate-400">÷</div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-slate-500">Denominador (embaixo)</p>
                      <OperandEditor
                        operand={ratio.denominator}
                        fields={filterFields}
                        numericFields={numericFields}
                        source={localConfig.source}
                        dateRange={dateRange}
                        onChange={(op) => patchRatio({ denominator: op })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={ratio.asPercent}
                        onChange={(e) => patchRatio({ asPercent: e.target.checked })}
                      />
                      Multiplicar por 100 e exibir como %
                    </label>
                    <p className="rounded bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 dark:bg-slate-900">
                      Divide qualquer valor por outro. Cada lado tem sua métrica (contagem, soma, média…) e filtros
                      próprios. Ex.: soma de <code>Receita</code> ÷ contagem de pedidos = ticket médio.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="mb-1 block text-[10px] font-medium text-slate-400">Formato</label>
                    <select
                      className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
                      value={localConfig.kpiFormat ?? "number"}
                      onChange={(e) =>
                        updateConfig({ kpiFormat: e.target.value as "number" | "percent" | "currency" })
                      }
                    >
                      {(Object.keys(KPI_FORMAT_LABELS) as (keyof typeof KPI_FORMAT_LABELS)[]).map((f) => (
                        <option key={f} value={f}>
                          {KPI_FORMAT_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </Section>
            ) : null}

            {isKpi ? (
              <Section title="Comparar períodos">
                <label className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={compare.enabled}
                    onChange={(e) => patchCompare({ enabled: e.target.checked })}
                  />
                  Comparar com outro período
                </label>
                {compare.enabled ? (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[10px] text-slate-400">Período de comparação (De / Até)</label>
                    <input
                      type="date"
                      className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                      value={compare.from?.slice(0, 10) ?? ""}
                      onChange={(e) => patchCompare({ from: e.target.value })}
                    />
                    <input
                      type="date"
                      className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                      value={compare.to?.slice(0, 10) ?? ""}
                      onChange={(e) => patchCompare({ to: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400">
                      Compara o valor do período atual com o intervalo escolhido e mostra a variação %.
                    </p>
                    {!localConfig.dateRange.field ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        Selecione um campo de data no bloco “Período” para o comparativo funcionar.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Section>
            ) : null}

            <Section title="Filtros">
              {localConfig.filters.map((filter, i) => (
                <div key={i} className="mb-2 space-y-1 rounded border border-border p-2">
                  <select
                    className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                    value={filter.field}
                    onChange={(e) => updateFilter(i, { field: e.target.value })}
                  >
                    {[...dimensions, ...metricFields].map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <select
                      className="w-20 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                      value={filter.operator}
                      onChange={(e) => updateFilter(i, { operator: e.target.value as WidgetFilter["operator"] })}
                    >
                      <option value="eq">=</option>
                      <option value="neq">≠</option>
                      <option value="contains">contém</option>
                      <option value="gt">&gt;</option>
                      <option value="lt">&lt;</option>
                    </select>
                    <FilterValueInput
                      source={localConfig.source}
                      field={filter.field}
                      operator={filter.operator}
                      value={String(filter.value)}
                      onChange={(v) => updateFilter(i, { value: v })}
                      dateRange={dateRange}
                      listKey={`widget-filter-${i}`}
                    />
                    <button type="button" className="text-red-500 text-xs" onClick={() => removeFilter(i)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
                onClick={addFilter}
              >
                + Adicionar filtro
              </button>
            </Section>

            {!isKpi ? (
            <Section title="Ordenação">
              <div className="flex gap-1">
                <select
                  className="min-w-0 flex-1 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                  value={localConfig.orderBy?.field ?? "value"}
                  onChange={(e) =>
                    updateConfig({
                      orderBy: { field: e.target.value, direction: localConfig.orderBy?.direction ?? "desc" },
                    })
                  }
                >
                  {orderMetricOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {localConfig.dimensions.map((d) => (
                    <option key={d} value={d}>
                      {dimLabel(d)}
                    </option>
                  ))}
                  {localConfig.secondaryDimension ? (
                    <option value={localConfig.secondaryDimension}>{dimLabel(localConfig.secondaryDimension)}</option>
                  ) : null}
                </select>
                <select
                  className="w-24 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                  value={localConfig.orderBy?.direction ?? "desc"}
                  onChange={(e) =>
                    updateConfig({
                      orderBy: {
                        field: localConfig.orderBy?.field ?? "value",
                        direction: e.target.value as "asc" | "desc",
                      },
                    })
                  }
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </Section>
            ) : null}
          </>
        ) : null}

        {isCohort && localConfig.source?.kind === "kommo" ? (
          <Section title="Coorte Kommo">
            <p className="text-[10px] text-slate-500">
              Análise de coorte pré-configurada com dados reais do Kommo. O período global do dashboard é aplicado
              automaticamente.
            </p>
          </Section>
        ) : null}

        <Section title="Período">
          <label className="mb-1 block text-[10px] font-medium text-slate-400">Campo de data</label>
          <select
            className="w-full rounded border border-border bg-surface px-1 py-1.5 text-[10px] dark:bg-slate-900"
            value={localConfig.dateRange.field ?? ""}
            onChange={(e) =>
              updateConfig({
                dateRange: {
                  ...localConfig.dateRange,
                  field: e.target.value || undefined,
                  mode: localConfig.dateRange.mode ?? "inherit",
                },
              })
            }
          >
            <option value="">Nenhum (sem filtro de data)</option>
            {dateFieldOptions.map((f) => (
              <option key={f.name} value={f.name}>
                {f.label}
              </option>
            ))}
          </select>
          {localConfig.dateRange.field ? (
            <div className="mt-2 space-y-2">
              <p className="text-[10px] font-medium text-slate-400">Intervalo</p>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                <input
                  type="radio"
                  name="date-range-mode"
                  className="mt-0.5"
                  checked={localConfig.dateRange.mode !== "custom"}
                  onChange={() =>
                    updateConfig({
                      dateRange: {
                        ...localConfig.dateRange,
                        mode: "inherit",
                        from: undefined,
                        to: undefined,
                      },
                    })
                  }
                />
                <span>
                  Usar período global
                  <span className="mt-0.5 block text-slate-400">{formatRangeLabel(dateRange.from, dateRange.to)}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                <input
                  type="radio"
                  name="date-range-mode"
                  checked={localConfig.dateRange.mode === "custom"}
                  onChange={() =>
                    updateConfig({
                      dateRange: { ...localConfig.dateRange, mode: "custom" },
                    })
                  }
                />
                Período personalizado
              </label>
              {localConfig.dateRange.mode === "custom" ? (
                <div className="space-y-1 pl-4">
                  <label className="block text-[10px] text-slate-400">De / Até</label>
                  <input
                    type="date"
                    className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                    value={localConfig.dateRange.from?.slice(0, 10) ?? toISODate(dateRange.from)}
                    onChange={(e) =>
                      updateConfig({ dateRange: { ...localConfig.dateRange, mode: "custom", from: e.target.value } })
                    }
                  />
                  <input
                    type="date"
                    className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
                    value={localConfig.dateRange.to?.slice(0, 10) ?? toISODate(dateRange.to)}
                    onChange={(e) =>
                      updateConfig({ dateRange: { ...localConfig.dateRange, mode: "custom", to: e.target.value } })
                    }
                  />
                </div>
              ) : (
                <p className="pl-4 text-[10px] text-slate-400">
                  Altere o calendário no topo da página para filtrar todos os widgets que usam o período global.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-slate-400">
              Sem campo de data, todos os registros da fonte são considerados (ignora o calendário global).
            </p>
          )}
        </Section>

        {localConfig.source && !isCohort && localConfig.dimensions.length > 0 ? (
          <Section title="Limite (Top N)">
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs dark:bg-slate-900"
              value={localConfig.limit ?? ""}
              placeholder="12 (padrão)"
              onChange={(e) => {
                const val = e.target.value ? Math.max(1, Number(e.target.value)) : undefined;
                updateConfig({ limit: val });
              }}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              {dimIsTime
                ? "Limita quantos períodos (ex.: meses) aparecem. Vazio = todos."
                : "Mostra apenas as N maiores categorias. Vazio = 12 (padrão)."}
            </p>
          </Section>
        ) : null}

        <div className="space-y-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onDuplicate}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Duplicar widget
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-900"
          >
            Remover widget
          </button>
        </div>
      </div>
    </aside>
  );
}

function PanelHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuração</h3>
      {onClose ? (
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
          ✕
        </button>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function MetricLabelField({
  value,
  placeholder,
  onChange,
  hint,
  compact = false,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  hint: string;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-slate-400">Rótulo personalizado</label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={compact ? "text-[10px] h-7" : "text-xs"}
      />
      <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}

function FilterValueInput({
  source,
  field,
  operator,
  value,
  onChange,
  dateRange,
  listKey,
  compact = false,
}: {
  source: WidgetDataSource | null;
  field: string;
  operator: WidgetFilter["operator"];
  value: string;
  onChange: (value: string) => void;
  dateRange: DateRange;
  listKey: string;
  compact?: boolean;
}) {
  const { values, loading } = useFieldValues(source, field, dateRange);
  const cls = compact
    ? "min-w-0 flex-1 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
    : "min-w-0 flex-1 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900";

  const hasOptions = values.length > 0;
  const useSelect = hasOptions && (operator === "eq" || operator === "neq");
  const useDatalist = hasOptions && operator === "contains";

  if (useSelect) {
    return (
      <select className={cls} value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
        <option value="">{loading ? "Carregando…" : "Selecione…"}</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <input
        className={cls}
        list={useDatalist ? listKey : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={loading ? "Carregando opções…" : useDatalist ? "Digite ou escolha…" : "Valor"}
      />
      {useDatalist ? (
        <datalist id={listKey}>
          {values.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

function OperandEditor({
  operand,
  fields,
  numericFields,
  source,
  dateRange,
  onChange,
}: {
  operand: KpiOperand;
  fields: { name: string; label: string }[];
  numericFields: { name: string; label: string }[];
  source: WidgetDataSource | null;
  dateRange: DateRange;
  onChange: (operand: KpiOperand) => void;
}) {
  const op = normalizeKpiOperand(operand);
  return (
    <div className="space-y-1 rounded border border-border p-2">
      <select
        className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
        value={op.metric.op}
        onChange={(e) => {
          const nextOp = e.target.value as MetricOp;
          onChange({ ...op, metric: { op: nextOp, column: nextOp === "count" ? undefined : op.metric.column } });
        }}
      >
        {METRIC_OPS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {op.metric.op !== "count" ? (
        <select
          className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
          value={op.metric.column ?? ""}
          onChange={(e) => onChange({ ...op, metric: { ...op.metric, column: e.target.value } })}
        >
          <option value="">Campo numérico…</option>
          {numericFields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.label}
            </option>
          ))}
        </select>
      ) : null}
      <p className="pt-1 text-[9px] uppercase tracking-wide text-slate-400">Filtros (opcional)</p>
      <FilterEditor
        filters={op.filters}
        fields={fields}
        source={source}
        dateRange={dateRange}
        onChange={(f) => onChange({ ...op, filters: f })}
      />
    </div>
  );
}

function FilterEditor({
  filters,
  fields,
  source,
  dateRange,
  onChange,
}: {
  filters: WidgetFilter[];
  fields: { name: string; label: string }[];
  source: WidgetDataSource | null;
  dateRange: DateRange;
  onChange: (filters: WidgetFilter[]) => void;
}) {
  const add = () =>
    onChange([...filters, { field: fields[0]?.name ?? "", operator: "eq", value: "" }]);
  const update = (index: number, patch: Partial<WidgetFilter>) =>
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const remove = (index: number) => onChange(filters.filter((_, i) => i !== index));

  return (
    <div>
      {filters.map((filter, i) => (
        <div key={i} className="mb-2 space-y-1 rounded border border-border p-2">
          <select
            className="w-full rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
            value={filter.field}
            onChange={(e) => update(i, { field: e.target.value })}
          >
            {fields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <select
              className="w-20 rounded border border-border bg-surface px-1 py-1 text-[10px] dark:bg-slate-900"
              value={filter.operator}
              onChange={(e) => update(i, { operator: e.target.value as WidgetFilter["operator"] })}
            >
              <option value="eq">=</option>
              <option value="neq">≠</option>
              <option value="contains">contém</option>
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
            </select>
            <FilterValueInput
              source={source}
              field={filter.field}
              operator={filter.operator}
              value={String(filter.value)}
              onChange={(v) => update(i, { value: v })}
              dateRange={dateRange}
              listKey={`operand-filter-${i}`}
              compact
            />
            <button type="button" className="text-red-500 text-xs" onClick={() => remove(i)}>
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
        onClick={add}
      >
        + Adicionar filtro
      </button>
    </div>
  );
}
