# O que é esse template

**Tempo de leitura:** ~5 min
**Pré-requisitos:** nenhum
**O que você vai aprender:**
- Qual problema esse template resolve
- O que já vem pronto (e o que você precisa criar)
- Quando esse template é a escolha certa (e quando não é)

---

## Em uma frase

Esse é um **template completo de SaaS multi-tenant** em Next.js + Supabase, feito pra você criar seu produto online com a ajuda do Claude Code, mesmo sem ser programador experiente.

## Pra que serve

Toda vez que você quer criar um app web onde:
- Pessoas se cadastram
- Têm um workspace (ou empresa, ou conta)
- Convidam outras pessoas pra colaborar
- Veem dados num dashboard
- Fazem o que seu produto faz

…você precisa construir essas **mesmas peças básicas**. Isso leva semanas. Esse template já tem todas elas funcionando, pra você focar só no que torna seu produto **único**.

## O que vem pronto

### Autenticação completa
- Página de cadastro com email + senha
- Confirmação de email
- Login
- Esqueci minha senha (com recuperação por email)
- Logout

### Workspaces (organizações) com membros
- Você pode ter vários workspaces (ou um por usuário, depende do seu produto)
- Convide pessoas por email — elas recebem um link, clicam, viram membros
- 3 níveis de acesso por workspace: **Dono**, **Admin** (gerencia membros), **Membro** (só usa)
- Edite o nome, slug (que aparece na URL) e logo do workspace

### Dashboard de exemplo
- Página inicial com 4 cards de números (KPIs) e um gráfico
- Tudo com dados fictícios — você troca por dados de verdade conforme cria suas funcionalidades

### Visual moderno
- Tema escuro com cor de destaque verde Kawasaki
- Funciona perfeito em celular e desktop
- Componentes prontos (botões, formulários, modais, sidebar) baseados em shadcn/ui

### Banco de dados seguro
- PostgreSQL no Supabase (escala automaticamente)
- **Row Level Security** ativa em todas as tabelas — ninguém vê o que não pode
- Migrations versionadas (você acompanha mudanças no schema)

### Email
- Sistema de envio com Resend (ou outro provedor)
- Template de convite e boas-vindas já desenhados

### Deploy pronto
- Dockerfile pra subir em qualquer VPS
- Guia passo-a-passo pra usar EasyPanel
- SSL automático

### Documentação pro Claude Code te ajudar
- Cada pasta importante tem um arquivo `CLAUDE.md` que orienta o Claude nos padrões do template

## O que você vai construir

Esse template é a **fundação** — o que cobre 70% do que todo SaaS precisa. Os 30% restantes (o que torna seu produto **seu**) você cria com a ajuda do Claude Code, digitando em português o que quer:

> "Quero uma página onde meus clientes podem cadastrar contatos e ver quem cadastrou."

Ou:

> "Adiciona uma tela de agendamento, com calendário e horários."

## Quando esse template é a escolha certa

✅ Você quer criar um **SaaS B2B ou B2C** com workspaces
✅ Você não é programador profissional, mas quer ter controle do seu produto
✅ Você quer **hospedar você mesmo** (VPS, EasyPanel, sem ficar refém da Vercel)
✅ Seu público fala **português**
✅ Você usa Claude Code pra desenvolver

## Quando NÃO é a escolha certa

❌ Você quer uma **landing page estática** — esse template tem dashboard, é overkill
❌ Você precisa de um **e-commerce robusto** — use Shopify ou Loja Integrada
❌ Você quer um **blog** — use WordPress ou Astro
❌ Você precisa de **realtime intenso** (chat ao vivo com muitos usuários) — adiciona depois, mas não vem pronto

## Próximo passo

Bora instalar tudo? Vai pra [02-instalando-tudo](./02-instalando-tudo.md).

---

## ❓ Travou? Peça ajuda

Abra o Claude Code e digite:
> "Não entendi [coisa específica] no template. Me explica de outro jeito?"

Ou cole o erro pro Claude e descreve o que tava tentando fazer.
