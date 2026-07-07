# Deploy — Supabase + Vercel

## ⚠️ Sobre as chaves do Supabase

O app usa **Prisma → PostgreSQL**. Você precisa das URLs de **banco de dados**, não das chaves públicas da API.

| Variável que você tem | Serve para Prisma? |
|----------------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ Não (API REST / cliente JS) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ❌ Não |
| `DATABASE_URL` (Connection string) | ✅ Sim |
| `DIRECT_URL` (Direct connection) | ✅ Sim (migrations) |

### Onde pegar no Supabase

1. [supabase.com](https://supabase.com) → seu projeto `xgttflfptdbrgyvyqcre`
2. **Project Settings** → **Database** → **Connection string**
3. Copie:
   - **Transaction pooler** (porta **6543**) → `DATABASE_URL` (+ `?pgbouncer=true`)
   - **Session pooler** (porta **5432**, host `pooler.supabase.com`) → `DIRECT_URL` (migrations)

> Se `db.xgttflfptdbrgyvyqcre.supabase.co:5432` der **P1001** no Windows, use o **Session pooler** (5432) como `DIRECT_URL` — não o host `db.*`.

Substitua `[YOUR-PASSWORD]` pela senha do banco definida na criação do projeto.

Exemplo (ajuste região/host):

```env
DATABASE_URL="postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

---

## Passo 1 — Aplicar schema no Supabase (local)

No `.env` local, cole `DATABASE_URL` e `DIRECT_URL` acima, mais:

```env
AUTH_SECRET="..."          # openssl rand -base64 32
APP_ENCRYPTION_KEY="..."   # openssl rand -base64 32
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
KOMMO_SUBDOMAIN="drivanramos"
KOMMO_ACCESS_TOKEN="..."
```

Depois:

```bash
npm install
npx prisma migrate deploy
npm run db:seed          # só na primeira vez, ambiente local/staging
npm run dev
```

> **Produção:** não rode `db:seed` com senhas demo. Crie o admin pelo painel ou seed customizado.

### `.env.local` vs `.env`

O Next.js carrega **`.env.local` por cima do `.env`**. Se `.env.local` tiver `DATABASE_URL="file:./dev.db"`, o login quebra com erro de protocolo PostgreSQL. Mantenha **as mesmas URLs Supabase** nos dois arquivos (ou remova `DATABASE_URL` do `.env.local`).

### Erro P1001 (Can't reach database)

1. Verifique se o projeto Supabase não está **pausado** (Dashboard → Restore project).
2. Use **Session pooler** na porta 5432 como `DIRECT_URL` (não `db.*.supabase.co`).
3. Alternativa: `npm run db:push` (sincroniza schema sem histórico de migrations).

---

## Passo 2 — GitHub

> Git não instalado? Use **GitHub Desktop** ou deploy direto com `npx vercel`. Detalhes em [`docs/VERCEL-CHECKLIST.md`](./VERCEL-CHECKLIST.md).

```bash
git add .
git commit -m "Migrate to PostgreSQL (Supabase) and harden auth"
git push origin main
```

---

## Passo 3 — Vercel

Guia completo: **[`docs/VERCEL-CHECKLIST.md`](./VERCEL-CHECKLIST.md)**  
**Produção com domínio:** **[`docs/VERCEL-PRODUCAO-claudiokalume.md`](./VERCEL-PRODUCAO-claudiokalume.md)**

Resumo:

1. [vercel.com/new](https://vercel.com/new) → Import repositório
2. Configure **Environment Variables** antes do deploy (tabela abaixo)
3. Deploy → copie URL → atualize `AUTH_URL` / `NEXTAUTH_URL` → Redeploy

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Pooler Supabase (6543) |
| `DIRECT_URL` | Direct Supabase (5432) |
| `AUTH_SECRET` | segredo forte |
| `APP_ENCRYPTION_KEY` | segredo forte |
| `AUTH_URL` | `https://SEU-APP.vercel.app` |
| `NEXTAUTH_URL` | igual `AUTH_URL` |
| `KOMMO_SUBDOMAIN` | `drivanramos` |
| `KOMMO_ACCESS_TOKEN` | token bearer |
| `CRON_SECRET` | segredo para cron (opcional) |
| `KOMMO_REFRESH_SECRET` | igual ou alternativo ao cron |

3. Deploy — o build roda `prisma migrate deploy && next build`

---

## Passo 4 — Primeiro admin

Após deploy, crie usuário admin:

- **Opção A:** rode seed uma vez apontando para Supabase (staging)
- **Opção B:** insira manualmente no Supabase Table Editor (User com `role = ADMIN` e senha bcrypt)
- **Opção C:** use o painel Admin se já tiver um admin

Registro público (`/register`) está **desabilitado**.

---

## Passo 5 — Verificar

- `https://SEU-APP.vercel.app/login` — sem contas demo
- Login → Dashboard com KPIs Kommo
- `/analytics` — widgets funcionando

---

## Cron Kommo (opcional)

`vercel.json` agenda `/api/kommo/refresh` a cada 6h. Configure `CRON_SECRET` na Vercel — ela envia `Authorization: Bearer ${CRON_SECRET}` automaticamente.

Ou chame manualmente:

```
GET /api/kommo/refresh?secret=SEU_KOMMO_REFRESH_SECRET
```
