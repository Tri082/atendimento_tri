# Elite da IA — Template

Template **SaaS multi-tenant** em Next.js 16 + Supabase, feito pra você construir seu produto conversando com o **Claude Code** em português.

> Pensado pra leigos. Você descreve o que quer ("quero uma página de pedidos") e o Claude Code constrói seguindo os padrões do template — multi-tenant, segurança, design system, tudo pronto.

---

## Índice rápido

1. [O que vem pronto](#o-que-vem-pronto)
2. [Antes de começar (pré-requisitos)](#antes-de-começar-pré-requisitos)
3. [Configuração passo a passo (~20 min)](#configuração-passo-a-passo-20-min)
4. [Checklist final — deu certo se…](#checklist-final--deu-certo-se)
5. [Variáveis opcionais (email, IA, WhatsApp)](#variáveis-opcionais-email-ia-whatsapp)
6. [Travou? Erros comuns](#travou-erros-comuns)
7. [Como pedir ajuda ao Claude Code](#como-pedir-ajuda-ao-claude-code)
8. [Próximos passos](#próximos-passos)
9. [Scripts disponíveis](#scripts-disponíveis)
10. [Glossário leigo](#glossário-leigo)

---

## O que vem pronto

**Autenticação & multi-tenant**
- Signup, login, recuperação de senha
- Workspaces (organizações) isolados via Row Level Security do Postgres
- Convites por email, roles (owner / admin / member)

**Interface & demos**
- Tema escuro com identidade visual já configurada (verde Kawasaki)
- Dashboard com KPIs e gráficos de exemplo
- CRM completo: contatos, empresas, deals, tarefas (CRUD real, não mock)
- Inbox multi-canal: WhatsApp Cloud API (oficial) + Evolution API (não-oficial)
- Demo de chat com IA (Anthropic / OpenAI)
- Settings de perfil e da organização (com upload de logo)

**Tooling de desenvolvimento**
- Padrões do template explicados pro Claude Code em arquivos `CLAUDE.md` espalhados pelo projeto
- Dockerfile + docker-compose prontos pra deploy em VPS (EasyPanel)
- Biome (lint + format) e Vitest configurados
- Documentação detalhada em [`docs/`](./docs/) (5 capítulos pra leigos)

### Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres + Auth + Storage + RLS) · React Hook Form + Zod · Recharts · Vercel AI SDK · Biome

---

## Antes de começar (pré-requisitos)

Você precisa ter instalado no seu computador:

- [ ] **Node.js 22 ou maior** — [nodejs.org](https://nodejs.org/) (escolha a versão **LTS**)
- [ ] **Git** — [git-scm.com/downloads](https://git-scm.com/downloads)
- [ ] **Claude Code** — [claude.com/claude-code](https://claude.com/claude-code)
- [ ] **VS Code** (recomendado) — [code.visualstudio.com](https://code.visualstudio.com)

E uma conta gratuita em:

- [ ] **Supabase** — [supabase.com](https://supabase.com) (Free plan basta — até 50 mil usuários)

### Como confirmar que tá tudo instalado

Abre o terminal (no VS Code: `Ctrl + ç` no Windows / `Cmd + ç` no Mac) e cola um por um:

```bash
node --version    # tem que aparecer v22.x.x ou maior
npm --version     # tem que aparecer 10.x.x ou maior
git --version     # tem que aparecer git version 2.x.x
```

Se algum desses falhar com "command not found" / "não é reconhecido", a instalação não pegou. Guia completo: [`docs/01-comecando/02-instalando-tudo.md`](./docs/01-comecando/02-instalando-tudo.md).

---

## Configuração passo a passo (~20 min)

> Tempo realista incluindo criar projeto no Supabase (~2 min de provisionamento) e aplicar o esquema. Não é "5 min mágicos" — é um SaaS completo, mas cada passo é clicável.

### Passo 1 — Extrair o template e abrir no editor

1. Baixe o `.zip` do template.
2. Extraia numa pasta — pode renomear pro nome do seu projeto (ex: `meu-saas`).
3. Coloca essa pasta num lugar fácil de achar (Desktop, Documentos…).
4. Abre o **VS Code** → **File → Open Folder** → seleciona a pasta `meu-saas`.
5. Abre o terminal integrado: **Terminal → New Terminal** (ou `Ctrl + ç`).

O terminal já abre **dentro da pasta certa** — não precisa navegar pra lugar nenhum.

### Passo 2 — Instalar as dependências

No terminal que você acabou de abrir, roda:

```bash
npm install
```

Demora 1–3 minutos. Vai baixar todas as bibliotecas que o template usa (cria uma pasta `node_modules/` enorme — não se assusta, é normal).

### Passo 3 — Iniciar controle de versão (recomendado)

Pra você poder voltar atrás se quebrar algo:

```bash
git init
git add .
git commit -m "primeiro commit"
```

Pronto — seu projeto agora tem histórico próprio. Mais tarde, quando quiser publicar, basta criar um repositório no GitHub e dar `git push`.

### Passo 4 — Criar um projeto no Supabase

1. Vai em [supabase.com](https://supabase.com) → **Start your project** → cadastra-se (pode usar conta Google ou GitHub).
2. Clique em **New Project**.
3. Preencha:
   - **Name:** nome do seu projeto (ex: `meu-saas-dev`)
   - **Database password:** senha forte. **ANOTA!** Você não vai usar agora, mas pode precisar depois.
   - **Region:** a mais próxima (ex: `sa-east-1` = São Paulo)
   - **Plan:** **Free** (suficiente pra começar)
4. Clique em **Create new project** e espera ~2 minutos até ficar pronto.

### Passo 5 — Anotar as 4 chaves do Supabase

Quando o projeto tiver "Healthy" no dashboard, vai em **Settings → API**. Anota **4 coisas**:

| Campo no Supabase | Pra que serve |
|---|---|
| **Project URL** (tipo `https://xxxxx.supabase.co`) | URL do seu banco |
| **anon (public) key** (começa com `eyJ...`) | Chave pública (vai no frontend) |
| **service_role key** (começa com `eyJ...`) | Chave **secreta** — nunca exponha! |
| **Project ID** (a parte `xxxxx` da URL) | Só precisa pro `npm run types` |

> ⚠️ A `service_role key` é tipo a senha de admin do banco. Nunca commite ela, nunca cole em código de frontend, nunca compartilhe.

### Passo 6 — Criar o `.env.local`

O `.env.local` é onde ficam as configurações secretas do seu app. Ele **não vai pro GitHub** (o `.gitignore` já protege).

Copia o template:

```bash
# Mac / Linux
cp .env.example .env.local
```

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Ou pelo Explorador: clica direito em `.env.example` → Copiar → Colar → renomeia pra `.env.local`.

### Passo 7 — Preencher as chaves no `.env.local`

Abre o `.env.local` no VS Code e cola as 4 coisas do passo 5. **No mínimo** essas linhas precisam estar preenchidas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_PROJECT_ID=xxxxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

As outras variáveis (Resend, IA, WhatsApp) são **opcionais** — pode deixar em branco que o app roda. Detalhes em [Variáveis opcionais](#variáveis-opcionais-email-ia-whatsapp).

> ⚠️ Não coloca aspas em volta das chaves no `.env.local` — só `CHAVE=valor`, sem aspas. E nunca commita esse arquivo.

### Passo 8 — (Opcional) Customizar o nome do app

Abre `config/app.config.ts` e edita:

```ts
export const appConfig = {
  name: "Meu SaaS",                  // ← nome que aparece na aba do navegador, header, footer
  description: "Descrição curta",    // ← usada em metadata HTML e emails
  // ...
}
```

### Passo 9 — Aplicar o esquema do banco no Supabase

O esquema do banco vem dividido em ~50 migrations sequenciais em `supabase/migrations/`. Você tem **dois caminhos** pra aplicar — escolhe um.

#### Caminho A — Supabase CLI (recomendado, 1 comando)

Se não tem o CLI instalado:

```bash
npm install -g supabase
```

Depois conecta seu projeto local ao remoto e empurra o esquema:

```bash
supabase link --project-ref SEU_PROJECT_ID
supabase db push
```

> `SEU_PROJECT_ID` é o mesmo `xxxxx` do passo 5. Ele vai pedir a senha do banco (aquela que você anotou no passo 4).

#### Caminho B — SQL Editor (manual, sem instalar CLI)

1. Abre o **Supabase Dashboard** → **SQL Editor** → **New query**.
2. Pra cada arquivo `.sql` em `supabase/migrations/`, na ordem **do menor pro maior número**:
   - Abre o arquivo no VS Code → `Ctrl + A` (seleciona tudo) → `Ctrl + C`.
   - No SQL Editor → cola → clica **Run** → espera "Success".
   - Vai pro próximo arquivo.
3. São ~50 arquivos. Sim, é chato — por isso o Caminho A existe.

> Daqui pra frente, **qualquer mudança no banco vira uma migration nova** em `supabase/migrations/`. O Claude Code cria pra você e você aplica via `supabase db push` ou colando só a nova no SQL Editor.

> Precisa **zerar o banco** em dev pra começar do zero? Cola `supabase/reset-dev.sql` no SQL Editor → Run, depois reaplica as migrations.

### Passo 10 — Rodar o app localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) no navegador.

### Passo 11 — Criar sua primeira conta

1. Clica em **Começar agora** (ou **Sign up**).
2. Preencha email + senha (mínimo 10 caracteres).
3. Confirma o email — se você **não** configurou Resend, vai cair no fallback: o email aparece **no terminal** onde o `npm run dev` tá rodando. Procura por um link `http://localhost:3000/auth/callback?...` e abre ele no navegador.
4. Crie seu primeiro workspace (organização) — esse é seu "espaço" multi-tenant.

> ⚠️ **Não usou Resend e travou aqui?** Você pode desabilitar a confirmação de email durante o desenvolvimento: vai no Supabase Dashboard → **Authentication → Providers → Email** → desmarca **Confirm email**. Pra produção, **deixa marcado**.

---

## Checklist final — deu certo se…

Depois do `npm run dev` rodando e do signup:

- [ ] Você vê o dashboard com KPIs e gráfico de exemplo
- [ ] O sidebar mostra: Dashboard, Tarefas, CRM, Inbox, Settings…
- [ ] Você consegue criar uma tarefa em **Tarefas** → **Nova tarefa**
- [ ] Você consegue criar um contato em **CRM → Contatos**
- [ ] Em **Settings → Workspace** o nome da org aparece
- [ ] O terminal não mostra erros vermelhos

Se tudo isso bate, tá tudo funcionando. Pode começar a pedir features pro Claude Code.

---

## Variáveis opcionais (email, IA, WhatsApp)

O app roda sem nenhuma dessas — mas algumas features ficam desabilitadas. Configura conforme for precisando.

### Email transacional (Resend)

**Sem isso:** convites e emails caem em fallback (mostram no terminal). Bom pra dev, ruim pra produção.

1. Cria conta gratuita em [resend.com](https://resend.com) (3.000 emails/mês grátis).
2. **API Keys → Create API Key → Full access** → copia a chave (`re_...`).
3. **Domains → Add Domain** → adiciona um domínio que VOCÊ controla (sem isso, Resend só envia pro seu próprio email cadastrado).
4. No `.env.local`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Meu SaaS <noreply@seudominio.com>
```

### Chat com IA (Anthropic ou OpenAI)

**Sem isso:** a demo de chat e o agente IA ficam desabilitados.

Escolhe **um** provider:

```env
# Opção 1 — Anthropic (Claude)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx       # console.anthropic.com

# Opção 2 — OpenAI (GPT)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx              # platform.openai.com/api-keys
```

### WhatsApp Cloud API (oficial)

Se quer a Inbox multi-canal com WhatsApp oficial da Meta, segue [`lib/messaging/CLAUDE.md`](./lib/messaging/CLAUDE.md) — exige conta Meta Business + número aprovado.

### Cron externo (não recomendado)

Deixa **vazio**. O recovery de mensagens já roda in-process via `instrumentation.ts` a cada 60s. Só preenche `CRON_SECRET` se for chamar `/api/cron/recover-messages` de fora (Vercel Cron, UptimeRobot…).

---

## Travou? Erros comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Failed to fetch` / `Invalid API key` no console do navegador | Chaves erradas no `.env.local` (ou trocou `anon` por `service_role`) | Confere as 3 chaves no passo 7. Depois **derruba o `npm run dev` com `Ctrl + C` e roda de novo** — Next só recarrega `.env.local` ao iniciar |
| `relation "X" does not exist` | Migrations não foram aplicadas | Roda o passo 9 (Caminho A ou B) |
| Email de confirmação não chega | Provedor SMTP do Supabase é lento / cai em spam | Cheque spam; ou desabilite **Confirm email** em **Authentication → Providers → Email** durante dev; ou configure Resend |
| Travou no signup, sem email no terminal | Pode estar com Resend mal-configurado | Comenta `EMAIL_PROVIDER=resend` no `.env.local`, reinicia, tenta de novo (vai pro fallback) |
| `npm install` dá erro de versão de Node | Node < 22 | Atualiza pro Node 22 LTS — [nodejs.org](https://nodejs.org/) |
| `.env.local` parece ser ignorado | Next.js só carrega quando o `dev` **inicia** | Derruba (`Ctrl + C`) e roda `npm run dev` de novo |
| Porta 3000 ocupada | Outro processo tá usando | `npm run dev -- -p 3001` (roda na 3001) |
| Página em branco depois do login | Cookie de sessão não foi setado (geralmente `NEXT_PUBLIC_APP_URL` errado) | Confere que `NEXT_PUBLIC_APP_URL` no `.env.local` é exatamente `http://localhost:3000` (sem barra no fim, sem `https`) |

Mais erros e diagnóstico em [`docs/05-resolvendo-problemas/`](./docs/05-resolvendo-problemas/). Ou copia o erro do terminal/navegador, cola pro Claude Code e fala: *"esse erro tá rolando, me ajuda a debugar"*.

---

## Como pedir ajuda ao Claude Code

Dentro da pasta do projeto, abre o terminal e roda:

```bash
claude
```

Aí **fala em PT-BR coloquial** — sem comando especial. Exemplos:

> "Quero adicionar uma página onde meus clientes podem ver pedidos deles."
>
> "Esse botão de salvar não tá funcionando, dá esse erro: ..." *(cola o erro)*
>
> "Revisa o que eu mudei antes de eu commitar."
>
> "Prepara o app pra eu publicar em produção."

O Claude lê os arquivos `CLAUDE.md` espalhados pelo projeto (raiz + `lib/` + `app/` + `components/`) e segue os padrões automaticamente — RLS, multi-tenant, padrão de Server Action, vocabulário leigo nas respostas, etc.

Internamente o Claude usa as **skills do superpowers** pra disciplina de brainstorm, plano, debug sistemático, code review e verificação de evidência. Você não precisa saber disso — só conversa em português.

---

## Próximos passos

Em ordem, na pasta [`docs/`](./docs/):

| Capítulo | Pra quê |
| --- | --- |
| [`01-comecando/`](./docs/01-comecando/) | O que é o template, instalação detalhada, primeira rodada, conhecendo Claude Code |
| [`02-criando-funcionalidades/`](./docs/02-criando-funcionalidades/) | Como pedir features pro Claude (com exemplos prontos) |
| [`03-banco-de-dados/`](./docs/03-banco-de-dados/) | Supabase explicado, multi-tenant, customizar tabelas |
| [`04-publicando/`](./docs/04-publicando/) | Preparar pra produção, EasyPanel, domínio + SSL |
| [`05-resolvendo-problemas/`](./docs/05-resolvendo-problemas/) | Erros comuns e quando pedir ajuda |

Bônus: [`docs/patterns.md`](./docs/patterns.md) tem 12 padrões copy-paste-ready (Server Action, Page com guard, Realtime, Migration org-scoped…) — útil pro Claude consultar quando você pede uma feature nova.

---

## Scripts disponíveis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor local em `http://localhost:3000` |
| `npm run build` | Build de produção (gera a pasta `.next/`) |
| `npm run start` | Roda o build de produção localmente |
| `npm run check` | Lint + format (Biome, com fix automático) |
| `npm run test` | Roda os testes (Vitest, uma vez) |
| `npm run test:watch` | Roda os testes ficando em modo "watch" |
| `npm run types` | Regenera `types/supabase.ts` a partir do banco remoto (precisa `SUPABASE_PROJECT_ID` no `.env.local`) |

---

## Glossário leigo

Termos que aparecem nos docs e nas mensagens do Claude:

| Termo | Tradução |
| --- | --- |
| **Workspace / Organização** | "Conta" dentro do app — cada user pode ter várias |
| **Multi-tenant** | Um mesmo app servindo vários workspaces, dados isolados |
| **RLS (Row Level Security)** | Regra de segurança do banco que decide quem vê o quê |
| **Server Action** | Função que roda no servidor (não no navegador) |
| **Migration** | Arquivo `.sql` que muda o banco — sempre vai em `supabase/migrations/` |
| **Schema** | Estrutura das tabelas do banco |
| **Env / `.env.local`** | Arquivo com configurações secretas (chaves, URLs…) |
| **Provider (LLM/Email)** | "Fornecedor" — quem entrega o serviço (Anthropic, Resend…) |
| **CRUD** | Criar, Ler, Atualizar, Deletar (operações básicas de banco) |
| **Realtime** | Atualização ao vivo (sem precisar dar F5) |

---

## Licença

MIT
