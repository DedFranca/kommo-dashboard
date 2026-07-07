import type { DataSourceFieldDef } from "@/types/widget-query";

/** Campos tabulares expostos pelo Kommo para o Query Builder. */
export const KOMMO_FIELD_DEFINITIONS: DataSourceFieldDef[] = [
  { name: "ID", label: "ID", logicalType: "number", role: "id" },
  { name: "Nome", label: "Nome do lead", logicalType: "string", role: "dimension" },
  { name: "Valor", label: "Valor", logicalType: "number", role: "metric" },
  { name: "Status_Nome", label: "Status", logicalType: "string", role: "dimension" },
  { name: "Pipeline_Nome", label: "Pipeline", logicalType: "string", role: "dimension" },
  { name: "Responsavel_Nome", label: "Responsável", logicalType: "string", role: "dimension" },
  { name: "Origem", label: "Origem", logicalType: "string", role: "dimension" },
  { name: "Local_da_Consulta", label: "Local da consulta", logicalType: "string", role: "dimension" },
  { name: "Medico", label: "Médico", logicalType: "string", role: "dimension" },
  { name: "Data_Criacao", label: "Data de criação", logicalType: "date", role: "time" },
  { name: "Data_Fechamento", label: "Data de fechamento", logicalType: "date", role: "time" },
  { name: "Data_Atualizacao", label: "Data de atualização", logicalType: "date", role: "time" },
  { name: "Tags", label: "Tags", logicalType: "string", role: "dimension" },
  { name: "Perdido", label: "Perdido", logicalType: "boolean", role: "dimension" },
  { name: "Score", label: "Score", logicalType: "number", role: "metric" },
  { name: "Custo_Trabalho", label: "Custo de trabalho", logicalType: "number", role: "metric" },
  { name: "Loss_Reason_Nome", label: "Motivo de perda", logicalType: "string", role: "dimension" },
  { name: "Motivo_de_perda", label: "Motivo de perda (custom)", logicalType: "string", role: "dimension" },
];

export function getKommoDimensions(): DataSourceFieldDef[] {
  return KOMMO_FIELD_DEFINITIONS.filter((f) => f.role === "dimension" || f.role === "time");
}

export function getKommoMetrics(): DataSourceFieldDef[] {
  return KOMMO_FIELD_DEFINITIONS.filter((f) => f.role === "metric");
}
