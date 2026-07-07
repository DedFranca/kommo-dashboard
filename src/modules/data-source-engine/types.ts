/** Tipos de conectores de dados suportados pela plataforma BI. */
export type DataSourceKind = "kommo" | "csv" | "api";

export type DataSourceDefinition = {
  id: string;
  kind: DataSourceKind;
  name: string;
  description?: string;
  /** Campos disponíveis após inferência de schema. */
  fields: DataSourceField[];
  createdAt: string;
  updatedAt?: string;
};

export type DataSourceField = {
  name: string;
  label: string;
  logicalType: "string" | "number" | "date" | "boolean";
  role: "dimension" | "metric" | "time" | "id";
  /** Campo calculado derivado de expressão. */
  calculated?: boolean;
  expression?: string;
};

export type CalculatedField = {
  id: string;
  name: string;
  label: string;
  expression: string;
  resultType: "number" | "string" | "boolean" | "percent";
  dataSourceId: string;
};
