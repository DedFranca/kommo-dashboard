import type { DataSourceFieldDef, WidgetDataSource } from "@/types/widget-query";

/** Tipos de fonte de dados suportados pela aba Analytics. */
export type DataSourceType = "kommo" | "google_sheets" | "csv";

export type DataSourcePreview = {
  columns: string[];
  rows: Record<string, string | null>[];
  rowCount: number;
};

/**
 * Abstração única de fonte de dados usada no builder de Analytics.
 * Vale para Kommo (conectado), Google Sheets (importado) e CSV (importado).
 */
export type UnifiedDataSource = {
  /** "kommo" para a fonte conectada; datasetId para datasets importados. */
  id: string;
  type: DataSourceType;
  label: string;
  description?: string;
  /** Dimensões + métricas detectadas/expostas. */
  fields: DataSourceFieldDef[];
  /** Pode ser atualizado a partir da fonte original (Kommo / re-import). */
  refreshable: boolean;
  status: "active" | "coming_soon";
  /** Primeiras linhas para pré-visualização ("dados não batem" guard). */
  preview?: DataSourcePreview;
  createdAt?: string;
};

export const DATA_SOURCE_TYPE_LABELS: Record<DataSourceType, string> = {
  kommo: "Kommo CRM",
  google_sheets: "Google Sheets",
  csv: "CSV importado",
};

export const DATA_SOURCE_TYPE_ICONS: Record<DataSourceType, string> = {
  kommo: "🟣",
  google_sheets: "📗",
  csv: "📄",
};

/** Converte a fonte unificada para o formato persistido no widget. */
export function toWidgetDataSource(ds: Pick<UnifiedDataSource, "id" | "type">): WidgetDataSource {
  if (ds.type === "kommo") return { kind: "kommo" };
  return { kind: "dataset", datasetId: ds.id };
}

/** Identifica a fonte persistida de um widget (sem precisar do registry). */
export function describeWidgetDataSource(
  source: WidgetDataSource | null,
): { kind: "kommo" | "dataset" | "google_sheets" | null; id: string | null } {
  if (!source) return { kind: null, id: null };
  if (source.kind === "kommo") return { kind: "kommo", id: "kommo" };
  if (source.kind === "dataset") return { kind: "dataset", id: source.datasetId };
  if (source.kind === "google_sheets") return { kind: "google_sheets", id: source.connectionId };
  return { kind: null, id: null };
}

/** Mapeia o sourceType persistido do dataset para o tipo unificado. */
export function datasetSourceTypeToUnified(sourceType: string | null | undefined): DataSourceType {
  if (sourceType === "google_sheets") return "google_sheets";
  return "csv";
}
