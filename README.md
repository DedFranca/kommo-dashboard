# Kommo Dashboard

Plataforma SaaS **Next.js** onde **Admin** cria contas, gerencia status de usuários, e define o que cada **Visualizador** vê. Dashboard com **widgets arrastáveis**, gráficos em tempo real do **Kommo CRM** e controle granular de acesso.

## O que funciona agora

✅ Autenticação JWT (login/logout)  
✅ Dashboard com widgets arrastáveis  
✅ Integração Kommo CRM (OAuth 2.0)  
✅ 3 papéis: Admin, Editor, Visualizador  
✅ Persistência de layout em PostgreSQL  

## O que vai ser adicionado

⏳ **Admin** pode criar contas (desabilitar /register)  
⏳ **Admin** pode suspender/reativar usuários  
⏳ **Admin/Editor** define quem (Visualizador) vê cada widget  
⏳ **Admin/Editor** filtra dados Kommo por role

## Stack

- Next.js (App Router) + TypeScript  
- Tailwind CSS + `next-themes` (dark mode)  
- Prisma ORM + SQLite (local) ou PostgreSQL (produção)  
- NextAuth.js (Auth.js v5) — login por **e-mail e senha** com papéis **Admin / Editor / Visualizador**  
- Recharts + react-grid-layout  

## Pré-requisitos

- Node.js 20+  
- PostgreSQL 14+ (ou Docker)  
- npm (ou pnpm/yarn, ajustando os comandos)

## Como rodar localmente

```bash
cd kommo-dashboard
cp .env.example .env
# Edite .env — principalmente DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev:clean
```

> **Estilos quebrados (página sem CSS)?** Pare todos os servidores Node, rode `npm run dev:clean` e use apenas uma instância. Não execute `npm run build` enquanto `npm run dev` estiver ativo — isso corrompe a pasta `.next` e faz o Tailwind parar de carregar.

Abra a URL do seu `.env` (ex.: [http://localhost:3001](http://localhost:3001) se `PORT=3001`). Após `npm run db:seed`, use:

| Papel | E-mail | Senha |
|--------|--------|--------|
| **Administrador** | `admin@kommo.local` | `Admin123!` |
| **Editor** | `editor@kommo.local` | `Editor123!` |
| **Visualizador** | `viewer@kommo.local` | `Viewer123!` |

- **Admin:** edita dashboard + gerencia papéis em `/dashboard/admin/users`  
- **Editor:** edita layout, painéis e fontes de dados  
- **Visualizador:** apenas leitura (métricas e período)  

Novas contas em **Criar conta** (`/register`) entram como **Visualizador**; um admin pode promover o papel depois.

## PostgreSQL

### Opção A — instalado na máquina

1. Crie um banco, por exemplo `kommo_dashboard`.  
2. Defina no `.env`:

   `DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/kommo_dashboard?schema=public"`

3. Rode as migrations: `npx prisma migrate deploy` (ou `npm run db:migrate` em desenvolvimento).

### Opção B — Docker (exemplo)

```bash
docker run --name kommo-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kommo_dashboard -p 5432:5432 -d postgres:16
```

Use então:

`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kommo_dashboard?schema=public"`

Nota rápida sobre provedores gerenciados (Supabase):

- Você pode usar Supabase como provedor PostgreSQL; copie a `DATABASE_URL` do painel Supabase para o `.env`.
- Antes de rodar migrations, garanta que `prisma/schema.prisma` está configurado com `provider = "postgresql"` (já preparado no repositório).
- Se suas migrations foram geradas originalmente em SQLite, considere recriar ou ajustar migrations para PostgreSQL ou usar `prisma db push` para sincronizar o schema inicialmente.

## Conectar à API do Kommo

1. **Subdomínio:** na URL Kommo (`https://SEU_SUBDOMINIO.kommo.com`), o trecho `SEU_SUBDOMINIO` é o valor de `KOMMO_SUBDOMAIN`.  
2. **Token no servidor (MVP):** crie uma integração / chave de API no Kommo com escopo adequado e coloque o **Bearer** em `KOMMO_ACCESS_TOKEN`. As chamadas são feitas **apenas nas Route Handlers** (`src/app/api/kommo/...` e serviços em `src/services`), nunca no browser.  
3. **Exemplo de endpoint:** `GET /api/kommo/summary` agrega dados para os cards (usa `/api/v4/leads` com `limit=1` para ler `_page.total` quando disponível).  
4. **Produção:** o fluxo recomendado é **OAuth 2.0 (authorization code)** da Kommo para obter `access_token` / `refresh_token`, armazená-los cifrados por conta (tabela futura) e renovar com `refresh_token`. Variáveis reservadas no `.env.example`: `KOMMO_CLIENT_*`, `KOMMO_REDIRECT_URI`.  
5. Documentação oficial: [Kommo for developers](https://www.kommo.com/developers/).

Sem `KOMMO_*` configurado, o app usa **dados mock** para os cards e continua funcional.

## Dashboard padrão (teste)

O layout padrão (v2) replica a estrutura do relatório de referência:

- Tabela de **análise de coorte** (conversão por semana)
- KPIs: **Novos leads**, **Taxa de conversão**, **Agendamentos**
- Gráfico **Lead ganho** (série temporal)
- Tabelas **Consultas por local** e **por origem**

Os números vêm de [`src/data/mock-dashboard.ts`](src/data/mock-dashboard.ts) (fictícios, apenas teste). API: `GET /api/dashboard/metrics`.

Se ainda vir o layout antigo (3 cards), use **Restaurar layout padrão** na barra do dashboard ou recarregue a página (layouts legados são atualizados automaticamente na primeira visita).

## Período e painéis personalizados

- **Período:** botão com calendário — clique na data inicial e depois na final, depois **Aplicar período**. Os dados mock são filtrados pelo intervalo.
- **Adicionar painel:** escolha tipo (KPI, gráfico, tabela), vincule a **dados do sistema** ou **importe JSON/CSV**.
- **Configurar painel (⚙):** troque a fonte de dados ou envie um novo arquivo para aquele painel.
- Fontes importadas ficam salvas em `Dashboard.dataSources` (PostgreSQL/SQLite).

Após atualizar o schema:

```bash
npx prisma migrate dev
```

### Exemplos de arquivo para importação

**KPI (JSON):** `{ "value": 1200, "hint": "teste" }`

**Gráfico (JSON):** `{ "data": [{ "label": "Jan", "value": 42, "date": "2026-01-01" }] }`

**Ranking (CSV):** `primary,secondary,value` com uma linha por item.

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e produção |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Usuário demo + dashboard |
| `npm run db:studio` | Prisma Studio |

## Estrutura principal

- `src/app` — rotas, layouts, API routes  
- `src/components` — UI reutilizável e dashboard  
- `src/lib` — Prisma singleton, auth, cliente HTTP Kommo  
- `src/services` — regras de negócio e orquestração  
- `src/hooks` — hooks de cliente (ex.: layout)  
- `src/database` — reexport do client Prisma (camada “database”)  
- `src/types` — tipos compartilhados (layout, Kommo summary)  
- `prisma/` — schema e migrations  

## Próximos passos sugeridos

- OAuth Kommo + armazenamento seguro de tokens por `User`  
- Multi-dashboard, permissões e widgets plugáveis  
- Testes (Playwright / Vitest) e CI  

Licença: uso interno / projeto de exemplo — ajuste conforme necessário.
