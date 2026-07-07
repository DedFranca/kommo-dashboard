# Produção — claudiokalume.com.br (Vercel)

## O que é “teste” vs “produção”

| Variável | No seu `.env` local | Na Vercel (produção) |
|----------|---------------------|----------------------|
| `DATABASE_URL` | Supabase pooler 6543 | **Igual** — o Supabase já é o banco de produção |
| `DIRECT_URL` | Supabase session 5432 | **Igual** |
| `AUTH_URL` | `http://localhost:3001` | **`https://claudiokalume.com.br`** (ou subdomínio) |
| `NEXTAUTH_URL` | `http://localhost:3001` | **Igual ao AUTH_URL** |
| `AUTH_SECRET` | `demo-auth-secret` | **Novo segredo forte** (nunca use demo) |
| `APP_ENCRYPTION_KEY` | `demo-encryption-key...` | **Novo segredo forte** |
| `PORT` | `3001` | **Não adicione** — a Vercel ignora |
| `KOMMO_SUBDOMAIN` | `drivanramos` | **Igual** (CRM real) |
| `KOMMO_ACCESS_TOKEN` | token JWT | **Igual** (CRM real) |

As URLs do **Supabase não são de teste** — local e produção usam o **mesmo projeto** Supabase.  
O que estava errado ao importar o `.env` inteiro: **`localhost`**, segredos **demo** e **`PORT`**.

---

## Onde hospedar o app no domínio

Escolha **uma** opção:

| Opção | URL do app | AUTH_URL / NEXTAUTH_URL |
|-------|------------|-------------------------|
| **A — Raiz** | `https://claudiokalume.com.br` | `https://claudiokalume.com.br` |
| **B — Subdomínio app** | `https://app.claudiokalume.com.br` | `https://app.claudiokalume.com.br` |
| **C — Subdomínio dashboard** | `https://dashboard.claudiokalume.com.br` | `https://dashboard.claudiokalume.com.br` |

Recomendado se o site principal já usa a raiz: **opção B ou C** (app/dashboard no subdomínio).

---

## Variáveis para colar na Vercel (Production)

Vercel → seu projeto → **Settings** → **Environment Variables**  
**Apague** as que vieram do import errado e recrie uma a uma.

Substitua `[SENHA-SUPABASE]` pela senha real do banco.

```
DATABASE_URL=postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA-SUPABASE]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.xgttflfptdbrgyvyqcre:[SENHA-SUPABASE]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

AUTH_URL=https://claudiokalume.com.br

NEXTAUTH_URL=https://claudiokalume.com.br

AUTH_SECRET=[GERE-UM-SEGREDO-NOVO-32-CHARS]

APP_ENCRYPTION_KEY=[GERE-OUTRO-SEGREDO-NOVO]

KOMMO_SUBDOMAIN=drivanramos

KOMMO_ACCESS_TOKEN=[SEU-TOKEN-KOMMO-IGUAL-AO-LOCAL]
```

Opcional:

```
KOMMO_METRICS_CACHE_TTL_MINUTES=20
CRON_SECRET=[segredo-para-cron]
KOMMO_REFRESH_SECRET=[mesmo-ou-outro-segredo]
```

**Não inclua:** `PORT`, `file:./dev.db`, `localhost`, `demo-auth-secret`.

Marque: **Production** (e Preview se quiser previews com mesmo banco).

---

## Gerar segredos (PowerShell)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Execute **duas vezes** — uma para `AUTH_SECRET`, outra para `APP_ENCRYPTION_KEY`.

---

## Domínio customizado na Vercel

1. Vercel → projeto → **Settings** → **Domains**
2. Add → `claudiokalume.com.br` (ou `app.claudiokalume.com.br`)
3. A Vercel mostra os registros DNS — configure no painel do seu registrador (Registro.br, Cloudflare, etc.)

### Se o domínio está na raiz (`claudiokalume.com.br`)

| Tipo | Nome | Valor |
|------|------|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

(Confirme os valores exatos na tela da Vercel — podem variar.)

### Se usa subdomínio (`app.claudiokalume.com.br`)

| Tipo | Nome | Valor |
|------|------|--------|
| **CNAME** | `app` | `cname.vercel-dns.com` |

4. Aguarde propagação DNS (5 min – 48 h)
5. Vercel emite **HTTPS** automaticamente

---

## Ordem correta (evita login quebrado)

1. Configure variáveis na Vercel com **`AUTH_URL` = URL final** (ex.: `https://claudiokalume.com.br`)
2. Faça **Deploy**
3. Adicione o domínio em **Domains** e configure DNS
4. Quando o domínio estiver **Valid** na Vercel, confira se `AUTH_URL` e `NEXTAUTH_URL` usam **https** e o domínio certo
5. **Redeploy** se tiver mudado `AUTH_URL` depois do primeiro deploy

---

## Login em produção

Contas criadas pelo `db:seed` no Supabase:

- `admin@kommo.local` / `Admin123!`

Troque a senha depois ou crie usuário novo no painel Admin.

---

## Se der 404 e o build terminar em ~24ms

A Vercel **não compilou** o Next.js. Veja a seção completa em [VERCEL-CHECKLIST.md](./VERCEL-CHECKLIST.md#404-not_found-e-build-em-24ms-sem-npm-install).

Resumo:

1. No GitHub, `package.json` + `src/` + `prisma/` devem estar na **raiz** do repo (ou ajuste **Root Directory** na Vercel).
2. **Framework Preset** = Next.js; **Output Directory** sem override.
3. Suba o código atualizado (inclui `vercel.json` com `buildCommand` explícito) e redeploy sem cache.

---

## Checklist rápido

- [ ] GitHub tem `package.json` na raiz do repositório
- [ ] Build na Vercel leva minutos (não 24ms)
- [ ] Removi variáveis `localhost` e `PORT` da Vercel
- [ ] `AUTH_SECRET` e `APP_ENCRYPTION_KEY` são **novos** (não demo)
- [ ] `AUTH_URL` = `https://claudiokalume.com.br` (com **https**, sem barra no final)
- [ ] `DATABASE_URL` tem `?pgbouncer=true` na porta **6543**
- [ ] Domínio adicionado na Vercel + DNS configurado
- [ ] Redeploy após ajustar URLs
