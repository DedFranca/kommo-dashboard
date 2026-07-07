---
name: dashboard-simplify-ux-fixes
overview: Corrigir persistência real do layout, resolver o menu de configuração cortado via portal/posicionamento, simplificar import de CSV para mapeamento X/Y sem BI, e tornar a sidebar colapsável com persistência.
todos:
  - id: fix-layout-persistence
    content: Garantir que layout persistido sempre tenha version e não seja resetado pelo normalize; validar caminho do SQLite e persistência após refresh.
    status: pending
  - id: widget-menu-portal
    content: Mover menu de configuração do widget para portal/fixed positioning com z-index/overlay e posicionamento inteligente.
    status: pending
  - id: simplify-csv-datasets
    content: Substituir BI/analytics por datasets simples (columns/rows) e binding X/Y por widget; remover módulos/rotas de agregação/recommend.
    status: pending
  - id: collapsible-sidebar
    content: Implementar sidebar colapsável com animação, modo ícones e persistência em localStorage.
    status: pending
isProject: false
---

# Simplificação + correções de UX do dashboard

## Diagnóstico (estado atual)

### Persistência de layout “some” após refresh
- O layout é salvo via `PATCH /api/dashboard/layout` em [`src/app/api/dashboard/layout/route.ts`](src/app/api/dashboard/layout/route.ts), que chama `updateDashboardLayout` e grava no Prisma (`Dashboard.layout`).
- O layout é carregado no SSR em [`src/app/(dashboard)/dashboard/page.tsx`](src/app/(dashboard)/dashboard/page.tsx) via `getOrCreateDashboardForUser`, que chama `normalizeDashboardLayout`.
- O `normalizeDashboardLayout` em [`src/types/dashboard-layout.ts`](src/types/dashboard-layout.ts) **reseta para o default** se:
  - `version` ausente, ou
  - `version < LAYOUT_VERSION`, ou
  - detectar “legacy layout”.

**Causa provável no seu ambiente (local + SQLite `file:./dev.db`)**
- A aplicação está conseguindo salvar `layouts`, mas em algum ponto o objeto salvo está indo para o banco **sem `version`** (ou `version` fica `undefined` e some no `JSON.stringify`), e no reload o `normalizeDashboardLayout` interpreta como “precisa resetar” e volta ao default.
- Alternativamente (menos provável), o `DATABASE_URL=file:./dev.db` está criando múltiplos arquivos dependendo do CWD do processo.

### Menu do widget cortado
- O container do widget no grid tem `overflow-hidden` em [`src/components/dashboard/dashboard-page-client.tsx`](src/components/dashboard/dashboard-page-client.tsx) (o `<div key={w.id} ... overflow-hidden ...>`), então qualquer popover absoluto dentro dele pode ser **clipado**.
- O menu atual em [`src/components/dashboard/widget-settings-menu.tsx`](src/components/dashboard/widget-settings-menu.tsx) é `position: absolute` dentro do widget → em widgets pequenos, ele é cortado.

### CSV/métricas complexas (quer simplificar)
- Hoje já existe import de dataset + querySpec/aggregation (muitos módulos em `src/lib/analytics/*`).
- Você quer **apenas**: importar CSV (já “tabular”), e em cada widget escolher **coluna X** e **coluna Y** (sem agregação/IA).

### Sidebar colapsável
- Sidebar fixa em [`src/components/layout/sidebar.tsx`](src/components/layout/sidebar.tsx) com largura `w-64`.
- O shell é [`src/components/layout/dashboard-shell.tsx`](src/components/layout/dashboard-shell.tsx).

## Nova arquitetura simples (CSV)

### Conceito
- **Dataset**: CSV persistido como tabela simples (`columns` + `rows`).
- **WidgetBinding**: em vez de gerar payload “BI”, o widget guarda:
  - `dataBinding.kind = "dataset"`
  - `datasetId`
  - `xKey`
  - `yKey`

### Fluxo

```mermaid
flowchart TD
  importBtn[Importar_dataset] --> ingest[POST_/api/datasets/ingest]
  ingest --> store[Store_dataset_JSON]
  widgetCfg[Widget_settings] --> select[Escolher_dataset_x_y]
  select --> saveBind[Salvar_binding_no_widget]
  render[WidgetRenderer] --> mapXY[Mapear_rows_para_{label,value}]
  mapXY --> recharts[Recharts]
```

- **Sem agregações**: o gráfico recebe os valores crus (já no formato do CSV).
- **Limite**: para UX/perf, mostrar top N linhas (ex.: 500) e paginação simples depois.

## Plano de implementação

### 1) Corrigir persistência real do layout
Arquivos: 
- [`src/app/api/dashboard/layout/route.ts`](src/app/api/dashboard/layout/route.ts)
- [`src/types/dashboard-layout.ts`](src/types/dashboard-layout.ts)
- (opcional) [`src/services/dashboard.service.ts`](src/services/dashboard.service.ts)

Mudanças:
- Garantir que o payload salvo **sempre** tenha `version: LAYOUT_VERSION`.
  - No `PATCH`, após `normalizeDashboardLayout`, forçar `normalized.version = LAYOUT_VERSION` antes de persistir.
- Garantir que `widgets` e `layouts` nunca sejam salvos vazios por acidente.
- (Hardening) Log/erro amigável se o banco não persistir.
- (Opcional) Fixar o caminho do SQLite para evitar CWD issues: sugerir `DATABASE_URL="file:./prisma/dev.db"`.

### 2) Menu de configuração do widget via portal (não clipa)
Arquivos:
- [`src/components/dashboard/widget-settings-menu.tsx`](src/components/dashboard/widget-settings-menu.tsx)
- Novo componente: `src/components/ui/popover.tsx` (portal + positioning)

Mudanças:
- Renderizar o painel de configuração em **portal para `document.body`**.
- Posicionar usando `getBoundingClientRect()` do botão ⚙:
  - preferir abrir abaixo; se não couber, abrir acima
  - clamp horizontal para não sair da tela
- Usar `position: fixed`, `z-index` alto, overlay para fechar.
- Remover dependência de `overflow` do widget.

### 3) Simplificar CSV/datasets: remover BI/overheads
Arquivos:
- Manter o botão “Importar dataset” e o modal existente, mas mudar o backend.
- Substituir rotas atuais `api/analytics/*` por rotas simples `api/datasets/*` (ou manter `analytics` mas com comportamento simples).

Mudanças:
- Definir types simples:
  - `Dataset = { id, name, fileName?, columns: string[], rows: Record<string,string|null>[], createdAt }`
- Persistência (simples e compatível com seu MVP):
  - guardar em `Dashboard.settings.datasets` (JSON) enquanto SQLite é MVP.
  - depois, opcionalmente migrar para tabela Prisma.
- Criar endpoints:
  - `POST /api/datasets/ingest` → salva dataset
  - `GET /api/datasets` → lista
  - `GET /api/datasets/[id]` → retorna columns + amostra
- Atualizar `WidgetSettingsMenu`:
  - “Usar dataset” → select dataset, select `xKey`, select `yKey`
  - salvar binding no widget (`widget.props.dataBinding = { kind: "dataset", datasetId, xKey, yKey }`)
- Atualizar `resolveWidgetContent` em [`src/lib/widget-data-resolver.ts`](src/lib/widget-data-resolver.ts):
  - se binding kind = dataset, montar payload para widget a partir de rows

**Remoção de overhead**
- Remover/arquivar módulos não usados:
  - `src/lib/analytics/*` agregação/recommend
  - `api/analytics/query`
  - qualquer UI que mostre métricas/operações

### 4) Sidebar retrátil com persistência
Arquivos:
- [`src/components/layout/sidebar.tsx`](src/components/layout/sidebar.tsx)
- [`src/components/layout/sidebar-nav.tsx`](src/components/layout/sidebar-nav.tsx)
- [`src/components/layout/dashboard-shell.tsx`](src/components/layout/dashboard-shell.tsx)
- (opcional) [`src/components/layout/header.tsx`](src/components/layout/header.tsx)

Mudanças:
- Criar estado `sidebarCollapsed` (React context ou hook) com persistência em `localStorage`.
- UI:
  - botão no topo da sidebar (hamburger/chevron)
  - animação `transition-[width] duration-200`
  - modo colapsado: largura ~`w-16`, mostrar só ícones; expandido: `w-64` com labels.
- Responsivo:
  - mobile mantém sidebar como drawer (futuro) ou continua escondida (`md:flex`).

## Test plan
- Mover widgets, clicar “Salvar layout”, dar refresh → layout deve permanecer.
- Reduzir widget ao mínimo e abrir ⚙ → menu não deve ser cortado e deve ficar acima de tudo.
- Importar CSV simples (`app,leads`), criar gráfico de barras, selecionar X/Y → render correto.
- Colapsar sidebar, refresh → estado persistido.
