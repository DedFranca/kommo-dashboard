/**
 * Gabarito de referência Dr. Ivan Ramos — alinhado ao Google Sheets.
 * IDs fixos usados como fallback quando a API não retorna o nome.
 */

export const GABARITO_ACCOUNT = {
  id: 34834647,
  name: "drivanramos",
};

export const GABARITO_USERS: Record<number, string> = {
  11758867: "Arlyssom",
  13466959: "Dr. Ivan Ramos",
  13467039: "Manu",
  13467067: "Rebeca",
};

export const GABARITO_PIPELINES: Record<number, string> = {
  13270095: "Interessados Consultas",
  13270099: "Consultas Marcadas",
  13270103: "Pós Venda",
  13563659: "Gestão de Pacientes - PMA",
  13368455: "Cursos",
  13450479: "Contato Interno",
  11504959: "Funil de vendas",
  13494543: "Paciente Inativo",
  13665707: "MENTORIA",
};

export const GABARITO_LOSS_REASONS: Record<number, string> = {
  30044179: "Valor da consulta",
  30044183: "Momento financeiro inadequado",
  30044187: "Vai decidir depois",
  30044191: "Mudou de ideia",
  35259107: "Optou por outro profissional",
  35259111: "Já resolveu o problema",
  35259115: "Falta de tempo / agenda",
  35259119: "Não respondeu / sumiu",
  35259123: "Não era paciente ideal",
  35259127: "Sem resposta",
  35259131: "Spam / curioso / pesquisa",
  35874611: "Só realizou a consulta",
};

/** Status global de ganho/perda (usados em múltiplos pipelines). */
export const GABARITO_WON_STATUS_IDS = new Set([142]);
export const GABARITO_LOST_STATUS_IDS = new Set([143]);

export const GABARITO_STATUSES: Record<number, string> = {
  142: "Venda ganha",
  143: "Venda perdida",
  88342831: "Incoming leads",
  88343035: "Pré-atendimento / Qualificação",
  88343039: "Agendamento Proposto",
  88343043: "Confirmação de Consulta",
  88343047: "Retorno / Seguimento",
  88343051: "Inativo / Resgate",
  93414927: "Pós-consulta / Relacionamento",
  93415103: "mtsd/alunas",
  99464627: "Depoimentos",
  102327863: "Incoming leads",
  102327867: "Contato inicial",
  102327871: "Follow up",
  102327875: "Carrinho",
  102327891: "Incoming leads",
  102327895: "Consulta Agendada",
  102327899: "30 Dias",
  102327903: "7 Dias",
  102327907: "Incoming leads",
  102327911: "Consulta Realizada",
  102327915: "Follow up",
  102327919: "Apresentação PMA",
  102327943: "Consulta Agendada",
  102327947: "Reagendamento",
  102327951: "48 Horas",
  102327955: "24 Horas",
  102327959: "Dia da consulta",
  102327963: "Consulta Iniciada",
  102328055: "Carrinho",
  102328059: "Iniciou PMA",
  102645531: "Pagamento Recebido",
  102645923: "Follow up Manual",
  103111823: "Incoming leads",
  103111827: "Contato inicial",
  103111831: "Oferta feita",
  103111835: "Negociação",
  103376719: "Downsell",
  103756623: "Incoming leads",
  103756627: "Equipe",
  103756631: "Fornecedores",
  103756635: "Outros",
  104105427: "Incoming leads",
  104105431: "Contato inicial",
  104105435: "Oferta feita",
  104105439: "Negociação",
  104581187: "D+0",
  104581191: "D+1",
  104581195: "D+2",
  104581199: "D+7",
  104581203: "D+14",
  104581207: "D+21",
  104581211: "D+30",
  104581215: "D+45",
  104581219: "D+60",
  104581223: "D+75",
  104581227: "D+80",
  104657671: "Incoming leads",
  104657675: "Acabou de Comprar",
  104666647: "I.A Interrompeu",
  104870099: "Disparo",
  105399591: "Acompanhamento pós adesão",
  105400151: "Consulta 1 Realizada",
  105462851: "Incoming leads",
  105462855: "Contato inicial",
  105462859: "Oferta feita",
  105462863: "Negociação",
  105507199: "Pós primeira consulta pma",
  105507203: "Consulta 2 realizada",
  105507207: "Pós segunda consulta pma",
  105507211: "consulta 3 realizada",
  105507215: "pós terceira consulta pma",
  105507219: "consulta 4 realizada",
  105507223: "em renovação",
  105507227: "follow up",
  105507231: "carrinho",
  105507235: "Renovou pma",
};

/** Colunas de campos customizados no CSV (chave → fragmentos de nome no Kommo). */
export const GABARITO_CUSTOM_FIELD_KEYS = {
  Objecao_do_paciente: ["objeção do paciente", "objecao do paciente", "objeção", "objecao"],
  Data_da_Consulta: ["data da consulta"],
  Origem: ["origem"],
  Motivo_de_perda: ["motivo de perda", "motivo da perda"],
  Data_de_Consulta: ["data de consulta", "data consulta"],
  Resposta_IA: ["resposta ia", "resposta_i_a"],
  Pedido_de_Exames: ["pedido de exames", "pedido exames"],
  Local_da_Consulta: ["local da consulta", "local consulta"],
  Medico: ["médico", "medico", "doctor"],
  PMA_Venda: ["pma venda", "pma_venda"],
  Debounce_Timestamp: ["debounce timestamp", "debounce"],
  Consulta_1: ["consulta 1", "consulta_1"],
  Consulta_2: ["consulta 2", "consulta_2"],
  Consulta_3: ["consulta 3", "consulta_3"],
  Consulta_4: ["consulta 4", "consulta_4"],
  PMS_Venda: ["pms venda", "pms_venda"],
} as const;

export type GabaritoCustomFieldKey = keyof typeof GABARITO_CUSTOM_FIELD_KEYS;
