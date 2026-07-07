# Desenvolvimento — Kommo Dashboard

**Objetivo:** Admin controla criação de contas, suspensão de usuários, e define o que Visualizador vê.

---

## 📋 O que fazer (Por ordem)

### 1. Suspender usuários (30 min)

**Mudança no BD:**
```sql
ALTER TABLE "User" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';  -- ACTIVE | SUSPENDED
```

**Ou via Prisma migration:**
```bash
npx prisma migrate dev --name add_user_status
```

**Schema (prisma/schema.prisma):**
```prisma
model User {
  // ... existente
  status   String @default("ACTIVE")  // ACTIVE | SUSPENDED
}
```

**Middleware (src/middleware.ts):**
Adicione no middleware existente uma validação:
```typescript
// Se user.status === SUSPENDED, retorna erro 403
```

**API (src/app/api/admin/users/[id]/suspend/route.ts):**
```typescript
export async function POST(req: Request) {
  const { id } = await params;
  const body = await req.json();
  
  await prisma.user.update({
    where: { id },
    data: { status: "SUSPENDED" }
  });
  
  return Response.json({ ok: true });
}
```

**UI:** Botão "Suspender" na página `/dashboard/admin/users`

---

### 2. Desabilitar /register

**Opção simples:** Remover a rota
```typescript
// Deletar src/app/(auth)/register/
```

**Ou fazer só admin criar contas via:**
```
POST /api/admin/users { email, password, role }
```

---

### 3. Widget access control (1 hora)

**Mudança no BD:**
```sql
CREATE TABLE "WidgetAccess" (
  "id" TEXT PRIMARY KEY,
  "dashboardId" TEXT,
  "widgetId" TEXT,
  "roles" TEXT,  -- JSON: ["ADMIN", "EDITOR"]
  UNIQUE("dashboardId", "widgetId")
);
```

**Ou Prisma:**
```prisma
model WidgetAccess {
  id          String @id @default(cuid())
  dashboardId String
  widgetId    String
  roles       String  // JSON string: '["VIEWER","EDITOR"]'
}
```

**Service (src/services/widget-access.ts):**
```typescript
export async function canViewWidget(
  dashboardId: string, 
  widgetId: string, 
  userRole: string
): Promise<boolean> {
  const access = await prisma.widgetAccess.findFirst({
    where: { dashboardId, widgetId }
  });
  
  if (!access) return true;  // sem restrição = todos podem ver
  
  const allowedRoles = JSON.parse(access.roles);
  return allowedRoles.includes(userRole);
}
```

**API - Configurar acesso (src/app/api/admin/widgets/[id]/access/route.ts):**
```typescript
export async function PATCH(req: Request) {
  const { id } = await params;
  const { dashboardId, roles } = await req.json();
  
  await prisma.widgetAccess.upsert({
    where: { dashboardId_widgetId: { dashboardId, widgetId: id } },
    create: { dashboardId, widgetId: id, roles: JSON.stringify(roles) },
    update: { roles: JSON.stringify(roles) }
  });
  
  return Response.json({ ok: true });
}
```

**API - GET métricas (modificar src/app/api/dashboard/metrics/route.ts):**
```typescript
// Filtrar widgets por role do usuário
const widgets = dashboard.layout.filter(w => 
  await canViewWidget(dashboard.id, w.id, session.role)
);
```

---

### 4. Filtrar dados Kommo por role (30 min)

**Simples:** No endpoint Kommo, verificar role e filtrar campos

**Exemplo (src/app/api/kommo/leads/route.ts):**
```typescript
let leads = await kommoApi.getLeads();

// Se role === VIEWER, remove campos sensíveis
if (session.role === "VIEWER") {
  leads = leads.map(l => ({
    id: l.id,
    name: l.name,
    email: l.email,
    status: l.status
    // removeu: phone, internal_notes, etc
  }));
}

return Response.json({ leads });
```

---

## 🔑 Arquivos a Criar/Modificar

| Arquivo | O que fazer |
|---------|-----------|
| `prisma/schema.prisma` | Adicionar `status` em User + novo model `WidgetAccess` |
| `src/middleware.ts` | Validar se user.status === SUSPENDED |
| `src/services/widget-access.ts` | ✨ NOVO — função `canViewWidget()` |
| `src/app/api/admin/users/[id]/suspend/route.ts` | ✨ NOVO — endpoint suspender |
| `src/app/api/admin/widgets/[id]/access/route.ts` | ✨ NOVO — configurar acesso widget |
| `src/app/api/dashboard/metrics/route.ts` | Modificar — filtrar por role |
| `src/app/api/kommo/leads/route.ts` | Modificar — filtrar campos |
| `src/app/(auth)/register/` | Deletar ou desabilitar |
| `src/app/(dashboard)/dashboard/admin/users/` | Adicionar botão suspender |

---

## 🚀 Ordem de Implementação

```
1️⃣  Suspender usuários (30 min)
    └─ Schema + migration + middleware + API

2️⃣  Desabilitar /register (5 min)
    └─ Deletar rota ou retornar erro

3️⃣  Widget access control (1 hora)
    └─ Schema + service + API PATCH + filtro GET

4️⃣  Filtrar dados Kommo (30 min)
    └─ Modificar endpoints Kommo por role
```

**Total:** ~2 horas

---

## 📝 SQL Rápido (se não usar Prisma migration)

```sql
-- Adicionar status em User
ALTER TABLE "User" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';

-- Novo model WidgetAccess
CREATE TABLE "WidgetAccess" (
  id TEXT PRIMARY KEY,
  "dashboardId" TEXT NOT NULL REFERENCES "Dashboard"(id),
  "widgetId" TEXT NOT NULL,
  roles TEXT NOT NULL,
  UNIQUE("dashboardId", "widgetId"),
  CONSTRAINT WidgetAccess_pkey PRIMARY KEY (id)
);
```

---

## 🔒 Checklist Simples

- [ ] Adicioar `status` em User
- [ ] Criar migration
- [ ] Validar SUSPENDED no middleware
- [ ] Endpoint POST /admin/users/:id/suspend
- [ ] Desabilitar /register
- [ ] Criar model WidgetAccess
- [ ] Criar service canViewWidget()
- [ ] Endpoint PATCH /admin/widgets/:id/access
- [ ] Filtrar GET /api/dashboard/metrics
- [ ] Filtrar dados Kommo por role
- [ ] Testar fluxo: criar user → suspender → bloquear → reativar
- [ ] Testar: Admin define acesso widget → Viewer não vê

---

## 🧪 Como Testar

**1. Suspender usuário:**
```bash
curl -X POST http://localhost:3001/api/admin/users/USER_ID/suspend
# Viewer tenta acessar dashboard → 403 "Conta suspensa"
```

**2. Widget access:**
```bash
curl -X PATCH http://localhost:3001/api/admin/widgets/widget-123/access \
  -d '{"dashboardId": "dash-1", "roles": ["EDITOR"]}'
# Viewer tenta buscar métricas → widget não aparece
```

---

## 📚 Referências Rápidas

| O que preciso | Onde está |
|---|---|
| Login/sessão atual | `src/lib/auth.ts` |
| Role do usuário | `session.user.role` |
| Criar dashboard | `src/services/dashboard.service.ts` |
| API Kommo | `src/lib/kommo/` |

---

## 💡 Dicas

1. **Status do User:** Use `"ACTIVE" | "SUSPENDED"` (simples)
2. **Roles em JSON:** `'["VIEWER", "EDITOR"]'` (string no DB, parse em JS)
3. **Sem acesso = array vazio:** `canViewWidget()` retorna false
4. **Test com 3 usuários:** admin, editor, viewer
5. **Kommo filtering:** Faça por role no endpoint (não na BD)

---

## ⚡ Scripts Úteis

```bash
# Reset BD
npx prisma migrate reset

# Criar nova migration
npx prisma migrate dev --name add_user_status

# Atualizar tipos
npx prisma generate

# Seed com dados
npm run db:seed
```

---

**Tempo total:** 2-3 horas  
**Complexidade:** Baixa (sem padrões avançados)  
**Quando terminar:** Sistema com controle admin completo ✅
