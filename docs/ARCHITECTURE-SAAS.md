# Arquitetura SaaS Multi-Tenant — Kommo Dashboard

## Visão geral

Plataforma B2B onde cada **Tenant (cliente)** possui usuários, dashboard e **uma ou mais integrações Kommo** isoladas. Nenhum dado de CRM cruza fronteiras de tenant.

```
┌─────────────┐     JWT + Refresh      ┌──────────────────┐
│  Login UI   │ ─────────────────────► │  API Auth v2     │
└─────────────┘                        └────────┬─────────┘
                                                │
┌─────────────┐     tenantId no token  ┌──────▼─────────┐
│  Dashboard  │ ◄────────────────────── │  Middleware    │
│  Analytics  │                        └──────┬─────────┘
└─────────────┘                               │
                                     ┌────────▼─────────┐
                                     │ KommoIntegration │
                                     │ (por tenant)     │
                                     └────────┬─────────┘
                                              │
                                     ┌────────▼─────────┐
                                     │  API Kommo v4    │
                                     └──────────────────┘
```

## Modelo de dados (Prisma)

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Cliente SaaS (`name`, `slug`, `status`) |
| `User` | Conta global (`email`, `platformRole`) |
| `TenantMembership` | Vínculo usuário ↔ cliente (`TENANT_ADMIN`, `EDITOR`, `VIEWER`) |
| `KommoIntegration` | Conta Kommo (`subdomain`, tokens criptografados, `isActive`) |
| `RefreshToken` | Refresh JWT (hash SHA-256, expiração) |
| `Dashboard` | Layout + cache métricas (`tenantId` + `userId` legado) |

## Autenticação

### JWT Access Token (15 min)
- Cookie httpOnly `km_access`
- Payload: `userId`, `tenantId`, `tenantSlug`, `tenantRole`, `platformRole`, `kommoIntegrationId`

### Refresh Token (7 dias)
- Cookie httpOnly `km_refresh`
- Hash armazenado em `RefreshToken` (rotação a cada refresh)

### APIs
| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/auth/v2/login` | Login + cookies |
| GET | `/api/auth/v2/me` | Sessão atual (JWT ou legado) |
| POST | `/api/auth/v2/refresh` | Renova access token |
| POST | `/api/auth/v2/logout` | Revoga refresh + limpa cookies |

NextAuth legado permanece como fallback durante migração.

## Kommo por tenant

- Tokens em `KommoIntegration` criptografados com `APP_ENCRYPTION_KEY` (AES-256-GCM)
- Conta ativa: `isActive = true` (uma por tenant)
- Renovação OAuth: `POST https://{subdomain}.kommo.com/oauth2/access_token`
- Cliente HTTP: `kommoFetchForTenant(tenantId, path)`
- Fallback env (`KOMMO_*`) apenas para dev / migração

## APIs administrativas

| Método | Rota | Acesso |
|--------|------|--------|
| GET/POST | `/api/admin/tenants` | `SUPER_ADMIN` |
| GET/PATCH/DELETE | `/api/admin/tenants/[id]` | `SUPER_ADMIN` |
| GET/POST | `/api/admin/tenants/[id]/members` | Super admin ou admin do tenant |
| GET/POST | `/api/admin/tenants/[id]/kommo` | Super admin ou admin do tenant |
| POST | `/api/admin/tenants/[id]/kommo/[id]/activate` | Troca conta ativa |

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/login/              # Login premium
│   ├── (dashboard)/
│   │   ├── dashboard/             # Dashboard executivo
│   │   ├── analytics/             # Analytics
│   │   └── admin/
│   │       ├── users/             # Usuários (legado)
│   │       └── platform/          # Clientes + Kommo (novo)
│   └── api/
│       ├── auth/v2/               # JWT login/refresh/logout
│       └── admin/tenants/         # CRUD multi-tenant
├── components/
│   ├── auth/                      # Login, badges
│   ├── admin/                     # Painéis admin
│   └── saas/                      # Componentes reutilizáveis SaaS
├── lib/
│   ├── auth/                      # JWT, cookies, session
│   ├── crypto/                    # Criptografia de tokens
│   └── kommo/                     # client, tenant-client
├── services/
│   ├── auth-v2.service.ts
│   ├── tenant.service.ts
│   └── kommo-integration.service.ts
└── types/
    └── tenant.ts
```

## Isolamento de dados

1. Toda API autenticada chama `getRequestSession()` → obtém `tenantId`
2. Métricas Kommo usam `getKommoMetricsForUserRange(..., { tenantId })`
3. Cache de leads chaveado por `tenantId + período`
4. Queries Prisma futuras devem incluir `where: { tenantId }`

## Variáveis de ambiente

```env
DATABASE_URL=
JWT_SECRET=                    # ou AUTH_SECRET
APP_ENCRYPTION_KEY=            # criptografia tokens Kommo
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=7
KOMMO_CLIENT_ID=               # OAuth (opcional por integração no DB)
KOMMO_CLIENT_SECRET=
KOMMO_REDIRECT_URI=
# Legado dev:
KOMMO_SUBDOMAIN=
KOMMO_ACCESS_TOKEN=
```

## Próximos passos

- [ ] OAuth flow completo Kommo (redirect + callback)
- [ ] Convite de usuários por e-mail
- [ ] Billing / planos por tenant
- [ ] Migrar 100% para JWT (remover NextAuth)
- [ ] PostgreSQL em produção
- [ ] Field mapping Kommo por tenant no DB

## Comandos

```bash
npx prisma migrate dev
npm run db:seed
```
