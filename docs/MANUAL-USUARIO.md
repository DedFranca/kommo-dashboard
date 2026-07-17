# Manual do usuário — KOMMO Dashboard

Guia completo para usar o sistema: login, dashboard executivo, analytics, usuários e integrações Kommo.

**URL de acesso:** `https://app.claudiokalume.com.br` (ou o domínio configurado pela sua equipe)

---

## Índice

1. [Primeiro acesso e login](#1-primeiro-acesso-e-login)
2. [Visão geral da interface](#2-visão-geral-da-interface)
3. [Dashboard executivo](#3-dashboard-executivo)
4. [Calendário e período de datas](#4-calendário-e-período-de-datas)
5. [Página Analytics](#5-página-analytics)
6. [Gerenciar usuários](#6-gerenciar-usuários)
7. [Cadastrar integrações Kommo (novas APIs)](#7-cadastrar-integrações-kommo-novas-apis)
8. [Papéis e permissões](#8-papéis-e-permissões)
9. [Perguntas frequentes](#9-perguntas-frequentes)

---

## 1. Primeiro acesso e login

### Como entrar

1. Abra o endereço do dashboard no navegador (Chrome, Edge, Safari).
2. Você verá a tela **KOMMO Dashboard — Acesse sua conta**.
3. Informe seu **e-mail** e **senha**.
4. Clique em **Entrar**.

Após o login, você é levado automaticamente ao **Dashboard**.

### Contas padrão (após configuração inicial)

| Papel | E-mail | Senha inicial |
|-------|--------|---------------|
| Administrador | `admin@kommo.local` | `Admin123!` |
| Editor | `editor@kommo.local` | `Editor123!` |
| Visualizador | `viewer@kommo.local` | `Viewer123!` |

> **Importante:** troque a senha do administrador após o primeiro acesso. Novas contas são criadas pelo administrador — não há cadastro público.

### Sair do sistema

- No menu lateral (sidebar), clique em **Sair** no rodapé, **ou**
- Em páginas internas, use o botão **Sair** no topo.

### Problemas comuns no login

| Situação | O que fazer |
|----------|-------------|
| “E-mail ou senha inválidos” | Confira credenciais; peça reset ao administrador |
| “Conta desativada” | Administrador precisa reativar sua conta |
| Página em loop no celular | Limpe cookies do site ou acesse `.../api/auth/v2/logout?redirect=/login` |
| Não carrega após login | Use sempre a mesma URL (ex.: `https://app.claudiokalume.com.br`) |

---

## 2. Visão geral da interface

### Menu lateral (sidebar)

| Item | Destino | Quem vê |
|------|---------|---------|
| **Dashboard** | Painel executivo com KPIs | Todos |
| **Analytics** | Painéis personalizáveis com widgets | Todos |
| **Usuários** | Gestão de contas e integrações | Somente **Administrador** |

No desktop, o menu pode ser **recolhido** (ícone de seta). No celular, use o **menu hambúrguer** (☰) no topo da página.

### Duas telas principais — não confundir

| | **Dashboard** | **Analytics** |
|---|---------------|---------------|
| **Objetivo** | Visão executiva fixa (KPIs e gráficos Kommo) | Montar painéis sob medida |
| **Editar layout?** | Não | Sim |
| **Importar CSV?** | Não | Sim (Admin/Editor) |
| **Compartilhar painéis?** | Não | Sim (Admin/Editor → Visualizador) |

---

## 3. Dashboard executivo

Rota: **Dashboard** no menu → `/dashboard`

Tela com os indicadores principais do CRM Kommo para o período selecionado.

### Cabeçalho da página

No topo você encontra:

- **Seletor de período** — intervalo de datas dos KPIs (ver seção 4).
- **Atualizar dados** (ícone ↻) — busca dados frescos na API Kommo. Só aparece se a integração estiver configurada.
- **Notificações** (sino) — painel de avisos (quando houver).
- **Menu mobile** — abre a sidebar em telas pequenas.

### Os 4 KPIs principais

| Card | O que mostra |
|------|--------------|
| **Total de Leads** | Quantidade de leads no período + variação % vs período anterior |
| **Ganho Mensal** | Receita em R$ + variação % |
| **Taxa de Conversão** | Percentual de conversão + variação % |
| **Consultas Fechadas** | Negócios ganhos no período + variação % |

Cada card inclui uma mini linha de tendência (sparkline) e a comparação com o período anterior (ex.: mês anterior).

### Gráfico: Leads × Consultas Fechadas

- Barras comparando **Leads** e **Consultas fechadas**.
- Alterne o agrupamento:
  - **Mensal** — últimos 6 meses (independente do filtro dos KPIs).
  - **Semanal** — desempenho semanal do último mês do período selecionado.
- Passe o mouse sobre as barras para ver valores detalhados.

### Estatísticas inferiores

Quatro cards adicionais:

- Média de Leads/Mês  
- Média de Consultas/Mês  
- Melhor Mês (Leads)  
- Melhor Mês (Consultas)  

### Atualizar dados do Kommo

1. Clique no ícone **↻ Atualizar** no cabeçalho.
2. O sistema consulta a API Kommo e recarrega as métricas.
3. Na primeira carga após deploy pode demorar ~20 segundos; depois fica mais rápido (cache).

### Estados da tela

| Estado | Significado |
|--------|-------------|
| Esqueleto cinza | Carregando dados |
| Banner âmbar | Dados parciais ou aviso de atualização |
| Mensagem de erro + **Tentar novamente** | Falha ao buscar métricas |
| Aviso sobre Kommo não configurado | Integração ausente — contate o administrador |

---

## 4. Calendário e período de datas

O seletor de período aparece no **Dashboard** e na página **Analytics**.

### Como usar o calendário

1. Clique no botão que mostra o intervalo atual (ex.: `01/07/2026 — 31/07/2026`).
2. Abre um painel com **dois meses** lado a lado.
3. Navegue entre meses com as setas **‹** e **›**.
4. Clique na **data inicial** do período.
5. Clique na **data final** do período.
6. Confirme com **Aplicar período** ou cancele com **Cancelar**.

### Comportamento padrão

- Ao abrir o sistema, o período padrão é o **mês calendário atual** (do dia 1 ao último dia do mês).
- Ao mudar o período no Dashboard, os **KPIs e comparações** são recalculados para esse intervalo.
- O gráfico em modo **Mensal** continua mostrando os últimos 6 meses, mesmo com outro período nos KPIs.

### Dica

Use períodos curtos (semana ou quinzena) para análise operacional; use o mês inteiro ou trimestre para visão gerencial.

---

## 5. Página Analytics

Rota: **Analytics** no menu → `/analytics`

Área para **criar painéis personalizados** com widgets (KPIs, gráficos, tabelas) usando dados do Kommo ou planilhas importadas.

### Modos: Visualização e Edição

| Modo | O que você pode fazer |
|------|------------------------|
| **Visualização** | Apenas ver os painéis (modo padrão para Visualizadores) |
| **Edição** | Arrastar widgets, redimensionar, configurar e salvar |

Administradores e Editores entram em edição pelo botão **Editar painéis** na barra superior.

Indicadores no topo: *Alterações pendentes*, *Salvando…*, *Salvo*.

### Layouts (presets)

Um **layout** é um painel salvo com nome próprio (ex.: “Funil comercial”, “Visão mensal”).

| Ação | Como fazer |
|------|------------|
| **Trocar layout** | Dropdown com o nome do layout ativo |
| **Criar layout** | **+ Novo Layout** → informe nome (e descrição opcional) |
| **Salvar alterações** | **Salvar layout** (ou aguarde o salvamento automático após ~2,5 s) |
| **Apagar layout** | Ícone de lixeira ao lado do seletor (com confirmação) |
| **Compartilhar** | Botão **Compartilhar** → marque os Visualizadores → **Salvar compartilhamento** |

**Visualizadores** só veem layouts que foram **compartilhados** com eles — em modo somente leitura.

### Biblioteca de widgets

No modo edição, o painel **Widgets** (esquerda) lista o que pode ser adicionado:

**KPIs**
- Indicador (KPI) — número único ou taxa percentual

**Gráficos**
- Linha, Barras, Área, Pizza, Coorte

**Tabelas**
- Tabela simples  
- Tabela cruzada (duas dimensões)

**Como adicionar um widget**
1. Entre em **modo Edição**.
2. Clique no tipo desejado na biblioteca.
3. O widget aparece no canvas (área central).
4. Selecione-o e configure no painel **Propriedades** (direita).
5. **Salve o layout**.

### Canvas (área central)

- Arraste widgets pelo ícone de movimento (modo edição).
- Redimensione pelas bordas.
- **Snap to grid** alinha widgets à grade.
- Layout vazio: use **+ Adicionar um KPI** ou **Entrar em modo edição**.

### Configurar um widget (painel Propriedades)

| Seção | Função |
|-------|--------|
| **Geral** | Título exibido no widget |
| **Fonte de dados** | Kommo CRM — Leads ou dataset importado (CSV/Sheets) |
| **Dimensão** | Campo para eixo/categorias (ex.: etapa do funil, responsável) |
| **Agrupar datas por** | Dia, semana, mês ou ano (quando a dimensão é data) |
| **Métrica** | Contagem, soma, média, mínimo, máximo, contagem distinta |
| **Cálculo do KPI** | Valor único ou divisão (taxa de conversão customizada) |
| **Comparar períodos** | KPI comparando intervalo customizado vs período atual |
| **Filtros** | Restringir dados (=, ≠, contém, >, <) com seletor de valores |
| **Ordenação** | Campo e direção (ascendente/descendente) |
| **Período** | Herdar período global ou definir datas próprias |
| **Limite (Top N)** | Quantidade máxima de categorias (ex.: top 12) |
| **Ações** | **Duplicar** ou **Remover** widget |

### Fontes de dados

Barra **Fontes de dados** (acima ou abaixo do canvas):

- Status **Kommo conectado** ou **não configurado**
- Quantidade de **datasets** importados
- **Atualizar** — recarrega a lista
- **+ Importar dataset** — Admin/Editor (ver abaixo)

#### Importar planilha (CSV ou Google Sheets)

1. Clique **+ Importar dataset**.
2. Escolha o tipo:
   - **Upload CSV** — arquivo `.csv` do computador
   - **Google Sheets** — cole a URL pública (“Qualquer pessoa com o link” como Leitor)
3. Opcional: dê um nome ao dataset.
4. Confirme — aparece pré-visualização das primeiras linhas.
5. Use o dataset como **fonte de dados** nos widgets.

Para **remover** um dataset: ícone de exclusão na lista (com confirmação).

### Compartilhar painel com Visualizadores

1. Salve o layout desejado.
2. Clique **Compartilhar**.
3. Marque os usuários com papel **Visualizador**.
4. **Salvar compartilhamento**.

O Visualizador passa a ver esse layout em Analytics, sem poder editar.

### Restaurar layout

**Restaurar layout padrão** (barra superior) **remove todos os widgets** do layout ativo — use com cuidado. Não restaura um template de fábrica; apenas limpa o canvas.

---

## 6. Gerenciar usuários

Rota: **Usuários** no menu → `/dashboard/admin/users`  
**Acesso:** somente **Administrador**

A página tem duas seções: **Gerenciar usuários** e **Integrações Kommo**.

### Listar usuários

Tabela com colunas:

| Coluna | Conteúdo |
|--------|----------|
| Usuário | Nome e e-mail |
| Papel | Administrador, Editor ou Visualizador |
| Status | Ativo ou Desativado |
| Integração Kommo | Qual API o Visualizador usa |
| Ações | Desativar, ativar ou excluir |

### Criar nova conta

1. Clique **Nova conta**.
2. Preencha:
   - **E-mail** (obrigatório)
   - **Nome**
   - **Senha** (mínimo 8 caracteres, com letra e número)
   - **Papel:** Editor ou Visualizador
3. Se o papel for **Visualizador**, opcionalmente escolha a **Integração Kommo** (qual cliente/CRM ele verá).
4. Clique **Criar conta**.

> Não é possível criar outro **Administrador** por esta tela — apenas Editor ou Visualizador.

### Editar usuário existente

| Ação | Como |
|------|------|
| Mudar papel | Dropdown na coluna **Papel** |
| Vincular integração Kommo | Dropdown na coluna **Integração** (só Visualizador) |
| Desativar / Ativar | Botão na coluna **Ações** |
| Excluir | Botão **Excluir** (pede confirmação) |

**Regras de segurança:**
- Você **não pode** desativar, excluir ou rebaixar **a sua própria** conta.
- Ao mudar Visualizador para Editor, a integração Kommo vinculada é removida automaticamente.

### Quando usar cada papel

| Papel | Indicado para |
|-------|----------------|
| **Administrador** | Dono do sistema, TI, gestor que cria usuários e integrações |
| **Editor** | Analista que monta painéis em Analytics |
| **Visualizador** | Cliente ou gestor que só consulta um funil/CRM específico |

---

## 7. Cadastrar integrações Kommo (novas APIs)

Seção inferior da página **Usuários** → **Integrações Kommo**  
**Acesso:** somente **Administrador**

Cada integração representa **uma conta Kommo diferente** (um cliente, uma filial, etc.).

### O que você precisa antes

Para cada cliente Kommo:

1. **Subdomínio** da conta (ex.: se acessa `minhaempresa.kommo.com`, o subdomínio é `minhaempresa`).
2. **Access Token** de longa duração gerado no painel do Kommo (Integrações → API).

### Cadastrar nova integração

1. Em **Integrações Kommo**, clique **Nova integração**.
2. Preencha:
   - **Nome** — rótulo interno (ex.: “Cliente ABC”, “Filial SP”)
   - **Subdomínio Kommo** — só o prefixo, sem `.kommo.com`
   - **Access Token** — token JWT longo gerado no Kommo
3. Clique **Criar integração**.

A integração aparece na tabela com colunas **Nome**, **Subdomínio** e **Ativa**.

### Como as integrações são usadas

| Tipo de usuário | Qual integração usa |
|-----------------|---------------------|
| **Administrador / Editor** | Integração **ativa** do tenant (padrão do sistema) |
| **Visualizador** | Integração **atribuída** na ficha do usuário |

**Fluxo típico para múltiplos clientes:**

1. Cadastre uma integração por cliente Kommo.
2. Crie um usuário **Visualizador** para cada cliente.
3. Vincule cada Visualizador à integração correta.
4. (Opcional) Compartilhe layouts de Analytics específicos com cada Visualizador.

### Integração via variáveis de ambiente (fallback)

O administrador de sistema também pode configurar no servidor:

- `KOMMO_SUBDOMAIN`
- `KOMMO_ACCESS_TOKEN`

Isso serve como integração padrão quando não há registro no banco. As integrações cadastradas pelo site têm prioridade para usuários vinculados.

### Renovar token Kommo

Tokens de longa duração expiram conforme política do Kommo. Quando expirar:

1. Gere um novo token no painel Kommo do cliente.
2. Cadastre uma nova integração ou peça ao suporte técnico para atualizar o token existente.

---

## 8. Papéis e permissões

### Matriz resumida

| Função | Admin | Editor | Visualizador |
|--------|:-----:|:------:|:------------:|
| Ver Dashboard (KPIs) | ✓ | ✓ | ✓ |
| Atualizar dados Kommo | ✓ | ✓ | ✓ |
| Ver Analytics | ✓ | ✓ | ✓ |
| Editar widgets / layouts | ✓ | ✓ | ✗ |
| Importar CSV / Sheets | ✓ | ✓ | ✗ |
| Compartilhar layouts | ✓ | ✓ | ✗ |
| Criar / editar usuários | ✓ | ✗ | ✗ |
| Cadastrar integrações Kommo | ✓ | ✗ | ✗ |
| Ver menu Usuários | ✓ | ✗ | ✗ |

### Dados que cada Visualizador vê

O Visualizador enxerga apenas os dados da **integração Kommo** associada à conta dele. Dashboard e widgets usam essa API — não misturam dados de outros clientes.

---

## 9. Perguntas frequentes

### Os números do Dashboard estão zerados ou desatualizados?

1. Clique **Atualizar** (↻) no cabeçalho.
2. Confira se o **período** no calendário inclui as datas dos leads.
3. Verifique se a integração Kommo está ativa e o token válido.

### O Visualizador não vê nenhum layout em Analytics?

O administrador ou editor precisa **compartilhar** o layout com esse usuário (botão **Compartilhar**).

### Posso me cadastrar sozinho?

Não. O registro público está desabilitado. Peça ao administrador para criar sua conta.

### Qual a diferença entre Dashboard e Analytics?

- **Dashboard** = painel fixo, pronto para gestão executiva (leads, receita, conversão).
- **Analytics** = você monta seus próprios gráficos e tabelas, importa planilhas e salva vários layouts.

### O site principal está em `claudiokalume.com.br`. O dashboard é outro endereço?

Sim. O dashboard costuma ficar em subdomínio separado, ex.: `https://app.claudiokalume.com.br`, para não conflitar com o site institucional.

### Esqueci minha senha

Contate o **administrador** do sistema para redefinir ou criar nova senha.

---

## Suporte técnico

Para problemas de infraestrutura (domínio, deploy, banco de dados), consulte também:

- `docs/DEPLOY.md` — implantação  
- `docs/VERCEL-PRODUCAO-claudiokalume.md` — domínio e variáveis de produção  
- `docs/VERCEL-CHECKLIST.md` — checklist de deploy  

---

*Última atualização: julho/2026 — KOMMO Dashboard v0.1*
