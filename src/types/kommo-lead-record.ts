import type { GabaritoCustomFieldKey } from "@/lib/kommo/gabarito";

/** Registro plano de lead — espelha colunas do Google Sheets / CSV. */
export type KommoLeadRecord = {
  ID: number;
  Nome: string;
  Valor: number;
  Status_ID: number | null;
  Status_Nome: string | null;
  Pipeline_ID: number | null;
  Pipeline_Nome: string | null;
  Responsavel_ID: number | null;
  Responsavel_Nome: string | null;
  Account_ID: number | null;
  Account_Nome: string | null;
  Group_ID: number | null;
  Loss_Reason_ID: number | null;
  Loss_Reason_Nome: string | null;
  Criado_Por: number | null;
  Atualizado_Por: number | null;
  Atualizado_Por_Nome: string | null;
  Score: number | null;
  Custo_Trabalho: number | null;
  Data_Criacao: string | null;
  Data_Atualizacao: string | null;
  Data_Fechamento: string | null;
  Proxima_Tarefa: string | null;
  Perdido: "SIM" | "NÃO";
  Tags: string | null;
  Tags_IDs: string | null;
  Contato_Principal_ID: number | null;
  Total_Contatos: number;
  Empresa_ID: number | null;
  Total_Empresas: number;
} & Record<GabaritoCustomFieldKey, string | null>;

export type KommoReferenceData = {
  account: { id: number; name: string };
  users: Record<number, string>;
  pipelines: Record<number, string>;
  statuses: Record<number, string>;
  lossReasons: Record<number, string>;
  customFields: Record<GabaritoCustomFieldKey, number[]>;
  wonStatusIds: number[];
  lostStatusIds: number[];
};

export type KommoLeadsResponse = {
  total: number;
  page: number;
  limit: number;
  records: KommoLeadRecord[];
  reference: KommoReferenceData;
};
