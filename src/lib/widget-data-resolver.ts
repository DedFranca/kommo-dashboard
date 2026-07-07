import type { DashboardWidget } from "@/types/dashboard-layout";
import type { DashboardMetrics } from "@/types/dashboard-metrics";
import type {
  BuiltinDataKey,
  CustomDataSource,
  DataBinding,
  KpiPayload,
} from "@/types/data-source";

function bindingFromWidget(widget: DashboardWidget): DataBinding | null {
  const b = widget.props?.dataBinding as DataBinding | undefined;
  if (b?.kind) return b;
  const metricKey = widget.props?.metricKey as string | undefined;
  const chartKey = widget.props?.chartKey as string | undefined;
  const tableKey = widget.props?.tableKey as string | undefined;
  if (metricKey) return { kind: "builtin", key: metricKey as BuiltinDataKey };
  if (chartKey === "leadsOverTime") return { kind: "builtin", key: "leadsOverTime" };
  if (chartKey === "salesOverTime") return { kind: "builtin", key: "salesOverTime" };
  if (chartKey === "conversionFunnel") return { kind: "builtin", key: "conversionFunnel" };
  if (chartKey === "responsiblePerformance") return { kind: "builtin", key: "responsiblePerformance" };
  if (chartKey === "leadEntryHeatmap") return { kind: "builtin", key: "leadEntryHeatmap" };
  if (tableKey === "byPipeline") return { kind: "builtin", key: "pipelineDistribution" };
  if (widget.type === "funnelChart") return { kind: "builtin", key: "conversionFunnel" };
  if (widget.type === "heatmapChart") return { kind: "builtin", key: "leadEntryHeatmap" };
  if (widget.type === "performanceChart") return { kind: "builtin", key: "responsiblePerformance" };
  return null;
}

function resolveTimeSeries(metrics: DashboardMetrics, chartKey?: string) {
  if (chartKey === "salesOverTime") {
    return { data: metrics.salesOverTime, subtitle: "Vendas ganhas por mês", dataLabel: "Vendas" };
  }
  return { data: metrics.leadsOverTime, subtitle: "Leads criados por mês", dataLabel: "Leads" };
}

export function resolveWidgetContent(
  widget: DashboardWidget,
  metrics: DashboardMetrics,
  customSources: CustomDataSource[],
  datasets: import("@/types/data-source").DashboardDataset[],
) {
  const binding = bindingFromWidget(widget);

  if (binding?.kind === "custom") {
    const src = customSources.find((s) => s.id === binding.sourceId);
    if (!src) return { error: "Fonte de dados não encontrada." as const };
    return { payload: src.payload, source: src };
  }

  if (binding?.kind === "dataset") {
    const dataset = datasets.find((d) => d.id === binding.datasetId);
    if (!dataset) return { error: "Dataset importado não encontrado." as const };

    const rows = dataset.rows;
    const xKey = binding.xKey;
    const yKey = binding.yKey;

    const numericRows = rows
      .map((row) => ({
        x: row[xKey] ?? "",
        y: Number(row[yKey]),
      }))
      .filter((row) => row.x !== null && row.x !== undefined && row.x !== "" && Number.isFinite(row.y));

    const aggregate = numericRows.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.x);
      acc[key] = (acc[key] ?? 0) + row.y;
      return acc;
    }, {});

    const series = Object.entries(aggregate).map(([label, value]) => ({ label, value }));

    if (widget.type === "kpi") {
      const total = series.reduce((sum, item) => sum + item.value, 0);
      return { kpi: { value: total, format: "number" as const } };
    }
    if (widget.type === "lineChart" || widget.type === "barChart" || widget.type === "areaChart") {
      return { line: { data: series, subtitle: dataset.name } };
    }
    if (widget.type === "pieChart" || widget.type === "rankingTable") {
      return {
        ranking: {
          rows: series.map((item) => ({ primary: item.label, secondary: `${item.value}`, value: item.value })),
          primaryLabel: xKey,
          secondaryLabel: yKey,
        },
      };
    }

    return { error: "Tipo de painel não compatível com dataset." as const };
  }

  const key = binding?.kind === "builtin" ? binding.key : null;
  const chartKey = widget.props?.chartKey as string | undefined;

  if (widget.type === "kpi") {
    const format = widget.props?.format as string | undefined;
    if (key === "totalLeads" || widget.props?.metricKey === "totalLeads") {
      return {
        kpi: {
          value: metrics.totalLeads,
          format: "number" as const,
          hint: "Todos os negócios na conta Kommo (sem filtro de data)",
        },
      };
    }
    if (key === "newLeads" || widget.props?.metricKey === "newLeads") {
      return {
        kpi: {
          value: metrics.newLeads,
          format: "number" as const,
          hint: `Criados entre ${metrics.periodLabel}`,
        },
      };
    }
    if (key === "conversionRate" || widget.props?.metricKey === "conversionRate") {
      return {
        kpi: {
          value: metrics.conversionRate,
          format: (format === "percent" ? "percent" : "number") as "percent",
          hint: `Taxa sobre leads criados no período (${metrics.periodLabel})`,
        },
      };
    }
    if (key === "avgClosingDays" || widget.props?.metricKey === "avgClosingDays") {
      return {
        kpi: {
          value: metrics.avgClosingDays,
          format: "days" as const,
          hint: "Média das vendas ganhas fechadas no período",
        },
      };
    }
    if (key === "wonLeads" || widget.props?.metricKey === "wonLeads") {
      return { kpi: { value: metrics.wonLeads, format: "number" as const, hint: "Vendas ganhas" } };
    }
    if (key === "lostLeads" || widget.props?.metricKey === "lostLeads") {
      return { kpi: { value: metrics.lostLeads, format: "number" as const, hint: "Vendas perdidas" } };
    }
    if (key === "inProgressLeads" || widget.props?.metricKey === "inProgressLeads") {
      return { kpi: { value: metrics.inProgressLeads, format: "number" as const, hint: "Leads em andamento" } };
    }
    return { kpi: { value: "—", format: "number" as const } satisfies KpiPayload };
  }

  if (widget.type === "funnelChart" || key === "conversionFunnel") {
    return { funnel: { stages: metrics.statusFunnel.length ? metrics.statusFunnel : metrics.conversionFunnel } };
  }

  if (widget.type === "heatmapChart" || key === "leadEntryHeatmap") {
    return {
      heatmap: {
        cells: metrics.leadEntryHeatmap,
        subtitle: widget.props?.subtitle as string | undefined,
      },
    };
  }

  if (widget.type === "performanceChart" || key === "responsiblePerformance") {
    return { performance: { rows: metrics.responsiblePerformance } };
  }

  if (widget.type === "lineChart" || widget.type === "barChart" || widget.type === "areaChart") {
    const series = resolveTimeSeries(metrics, chartKey);
    return {
      line: {
        data: series.data,
        subtitle: (widget.props?.subtitle as string | undefined) ?? series.subtitle,
        dataLabel: series.dataLabel,
      },
    };
  }

  if (widget.type === "pieChart" || widget.type === "rankingTable") {
    if (key === "pipelineDistribution" || widget.props?.tableKey === "byPipeline") {
      return {
        ranking: {
          rows: metrics.pipelineDistribution,
          primaryLabel: "Pipeline",
          secondaryLabel: "Leads",
          valueLabel: "leads criados no período",
        },
      };
    }
    return { error: "Configure a fonte de dados deste painel." as const };
  }

  if (widget.type === "cohortTable" || widget.type === "cohortChart") {
    return { error: "Coorte não disponível — use apenas dados do Kommo em tempo real." as const };
  }

  return { error: "Configure a fonte de dados deste painel." as const };
}
