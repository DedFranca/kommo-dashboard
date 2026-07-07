"use client";

import { useCallback, useEffect, useState } from "react";
import type { DataSourceType } from "@/types/data-source-registry";
import type { DataSourceFieldDef, WidgetDataSource } from "@/types/widget-query";

export type DataSourceListItem = {
  id: string;
  type: DataSourceType;
  kind: "kommo" | "dataset";
  name: string;
  description?: string;
  refreshable: boolean;
  fieldCount: number;
  status: "active" | "coming_soon";
  createdAt?: string;
};

export function useDataSources() {
  const [sources, setSources] = useState<DataSourceListItem[]>([]);
  const [kommoConfigured, setKommoConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data-sources");
      if (res.ok) {
        const data = (await res.json()) as { sources: DataSourceListItem[]; kommoConfigured: boolean };
        setSources(data.sources);
        setKommoConfigured(data.kommoConfigured);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const datasets = sources.filter((s) => s.kind === "dataset");

  return { sources, datasets, kommoConfigured, loading, refresh };
}

export function useDataSourceFields(source: WidgetDataSource | null) {
  const [fields, setFields] = useState<DataSourceFieldDef[]>([]);
  const [dimensions, setDimensions] = useState<DataSourceFieldDef[]>([]);
  const [metrics, setMetrics] = useState<DataSourceFieldDef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source) {
      setFields([]);
      setDimensions([]);
      setMetrics([]);
      return;
    }

    let url: string | null = null;
    if (source.kind === "kommo") url = "/api/data-sources/kommo/fields";
    else if (source.kind === "dataset") url = `/api/data-sources/dataset/${source.datasetId}/fields`;

    if (!url) {
      setFields([]);
      setDimensions([]);
      setMetrics([]);
      return;
    }

    setLoading(true);
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setFields(data.fields ?? []);
        setDimensions(data.dimensions ?? []);
        setMetrics(data.metrics ?? []);
      })
      .finally(() => setLoading(false));
  }, [source]);

  return { fields, dimensions, metrics, loading };
}
