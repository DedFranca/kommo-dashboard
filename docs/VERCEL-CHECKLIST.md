# Checklist — Deploy Vercel

Use esta lista ao configurar o projeto na Vercel. **Não cole senhas neste arquivo.**

---

## Pré-requisitos

- [ ] Supabase com migrations aplicadas (`npx prisma migrate deploy` já rodou local)
- [ ] Código no GitHub (ou use `npx vercel` — ver abaixo)
- [ ] Conta em [vercel.com](https://vercel.com)

---

## 1. Subir código para o GitHub

### Opção A — GitHub Desktop / site (sem Git no terminal)

1. Crie repositório em [github.com/new](https://github.com/new) (ex.: `kommo-dashboard`, privado)
2. Instale [GitHub Desktop](https://desktop.github.com/) → **Add existing repository** → pasta do projeto
3. Commit + **Publish repository**

### Opção B — Terminal (se tiver Git)

```powershell
cd c:\Users\ded32\OneDrive\Desktop\kommo-dashboard
git init
git add .
git commit -m "Prepare production deploy"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kommo-dashboard.git
git push -u origin main
```

### Opção C — Vercel CLI (sem GitHub)

```powershell
npm i -g vercel
cd c:\Users\ded32\OneDrive\Desktop\kommo-dashboard
vercel login
vercel
```

Siga o assistente; na primeira vez é preview, depois `vercel --prod`.

---

## 2. Importar na Vercel

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → selecione `kommo-dashboard`
3. **Framework Preset:** Next.js (detectado automaticamente)
4. **Root Directory:** `./` (raiz)
5. **Build Command:** deixe padrão ou confirme: `prisma migrate deploy && next build`
6. **Install Command:** `npm install`
7. **Node.js Version:** 20.x (Settings → General, se necessário)

**Não clique Deploy ainda** — configure as variáveis primeiro.

---

## 3. Environment Variables (Production + Preview)

Vercel → Project → **Settings** → **Environment Variables**

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `DATABASE_URL` | Transaction pooler Supabase, porta **6543**, com `?pgbouncer=true` | ✅ |
| `DIRECT_URL` | Session pooler Supabase, porta **5432** (`aws-0-us-east-1.pooler.supabase.com`) | ✅ |
| `AUTH_SECRET` | Segredo aleatório longo (32+ chars) | ✅ |
| `APP_ENCRYPTION_KEY` | Outro segredo aleatório longo | ✅ |
| `AUTH_URL` | `https://SEU-PROJETO.vercel.app` (ajuste após 1º deploy) | ✅ |
| `NEXTAUTH_URL` | Igual a `AUTH_URL` | ✅ |
| `KOMMO_SUBDOMAIN` | `drivanramos` | ✅ |
| `KOMMO_ACCESS_TOKEN` | Token bearer Kommo | ✅ |
| `KOMMO_METRICS_CACHE_TTL_MINUTES` | `20` | opcional |
| `CRON_SECRET` | Segredo para cron Vercel | opcional |
| `KOMMO_REFRESH_SECRET` | Mesmo valor ou outro segredo | opcional |

### Gerar segredos (PowerShell)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Rode duas vezes — uma para `AUTH_SECRET`, outra para `APP_ENCRYPTION_KEY`.

### Exemplo de URLs Supabase (troque `[SENHA]`)

```
DATABASE_URL=postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Marque **Production**, **Preview** e **Development** para todas.

---

## 4. Deploy

1. Clique **Deploy**
2. Aguarde o build (~2–5 min)
3. Se falhar em `prisma migrate deploy`, veja [Troubleshooting](#troubleshooting) abaixo

---

## 5. Após o primeiro deploy

1. Copie a URL final (ex.: `https://kommo-dashboard-xxx.vercel.app`)
2. Volte em **Environment Variables** e atualize:
   - `AUTH_URL` = URL final
   - `NEXTAUTH_URL` = URL final
3. **Redeploy** (Deployments → ⋮ → Redeploy)

---

## 6. Login em produção

Se você já rodou `npm run db:seed` apontando para o **mesmo Supabase**, use:

- E-mail: `admin@kommo.local`
- Senha: `Admin123!`

Depois troque a senha ou crie admin novo pelo painel Admin.

Registro público (`/register`) está **desabilitado**.

---

## 7. Verificação

- [ ] `https://SEU-APP.vercel.app/login` abre
- [ ] Login funciona
- [ ] `/dashboard` carrega KPIs (primeira vez pode demorar ~20s — cache Kommo)
- [ ] `/analytics` abre widgets

---

## Troubleshooting

### 404 NOT_FOUND e build em ~24ms (sem `npm install`)

**Sintoma no log:** só aparece `Running "vercel build"` → `Build Completed in /vercel/output [24ms]` — **não** há `Installing dependencies` nem `next build`.

Isso significa que a Vercel **não encontrou** um app Next.js na pasta que ela está usando. O deploy fica vazio → 404.

**Passo 1 — Confira o GitHub**

Abra `https://github.com/DedFranca/kommo-dashboard-git` e verifique na **raiz** do repositório (branch `main`):

- [ ] `package.json`
- [ ] `src/`
- [ ] `prisma/`
- [ ] `next.config.ts`

Se esses arquivos estiverem **dentro de uma subpasta** (ex.: `kommo-dashboard/package.json`), anote o nome da pasta.

Se a raiz só tiver `README.md` ou poucos arquivos → **suba o projeto inteiro** (GitHub Desktop: Add existing repository → pasta `kommo-dashboard` → commit all → Push).

**Passo 2 — Settings → General (Vercel)**

| Campo | Valor correto |
|-------|----------------|
| **Root Directory** | vazio ou `.` — **ou** a subpasta onde está o `package.json` |
| **Node.js Version** | 20.x |

**Passo 3 — Settings → Build and Development**

| Campo | Valor correto |
|-------|----------------|
| **Framework Preset** | **Next.js** |
| **Build Command** | Override **desligado** (usa `npm run build` do `package.json`) **ou** `npm run build` |
| **Output Directory** | Override **desligado** (vazio — **não** coloque `.next`, `out` ou `public`) |
| **Install Command** | Override **desligado** **ou** `npm install` |

**Erro comum:** Build Command = `npm install` (só instala, não compila).

**Passo 4 — Redeploy**

Deployments → ⋮ no último deploy → **Redeploy** (marque *Use existing Build Cache* **desligado**).

**Build saudável** leva **2–5 minutos** e o log mostra algo como:

```
Installing dependencies...
Detected Next.js
Running "npm run build"
prisma migrate deploy
...
```

**Passo 5 — Depois que o build passar**

Atualize `AUTH_URL` e `NEXTAUTH_URL` com a URL real `https://seu-projeto.vercel.app` e redeploy.

---

### Build falha: `prisma migrate deploy`

- Confirme `DIRECT_URL` (Session pooler 5432, não host `db.*`)
- Supabase project não pausado
- Migration já aplicada? Build deve passar mesmo assim

### Build falha: `Can't reach database`

- Senha correta na URL (sem caracteres especiais sem escape)
- Use pooler URLs, não IP direto

### Login 500 / erro de banco

- `DATABASE_URL` deve ser pooler **6543** com `?pgbouncer=true`
- `AUTH_URL` deve bater com a URL da Vercel

### Kommo lento na Vercel

- Normal na 1ª carga (busca todos os leads)
- Cache 20 min — recargas seguintes mais rápidas

### Cron não roda ou deploy bloqueia o cron

- Plano **Hobby**: no máximo **1 execução por dia** (`0 9 * * *` no `vercel.json`)
- Plano **Pro**: permite crons mais frequentes (ex.: a cada 6h)
- Alternativa: chamar manualmente `/api/kommo/refresh?secret=SEU_SECRET`

---

## Domínio customizado (opcional)

Vercel → Project → **Settings** → **Domains** → adicione `dashboard.seudominio.com.br` e configure DNS conforme instruções da Vercel. Atualize `AUTH_URL` e `NEXTAUTH_URL` de novo.
