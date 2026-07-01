# O que é Supabase

**Tempo de leitura:** ~5 min
**Pré-requisitos:** nenhum
**O que você vai aprender:**
- O que é Supabase (em uma frase)
- O que ele te dá pronto
- Por que escolhemos ele pra esse template

---

## Supabase em uma frase

Supabase é um **kit de bastidores pronto** pro seu app: banco de dados, login de usuários, armazenamento de arquivos e mais — tudo num lugar só, com painel web e nível gratuito generoso.

## O que ele te dá pronto

### 1. Banco de dados PostgreSQL
PostgreSQL é o banco de dados profissional mais respeitado do mundo. Mesmo que seu app cresça pra milhões de usuários, o banco aguenta. Você não precisa instalar nada — Supabase cuida.

### 2. Autenticação de usuários
Login, signup, recuperação de senha, login social (Google/GitHub/etc.) — tudo isso já vem pronto. Você só usa.

### 3. Armazenamento (Storage)
Pra fotos de perfil, logos, anexos, qualquer arquivo do usuário. Funciona tipo um "Google Drive privado" do seu app.

### 4. Realtime (não usamos na v1)
Pra coisas tipo chat ao vivo ou notificações instantâneas. Disponível, mas o template não usa por padrão.

### 5. Edge Functions (não usamos na v1)
Pra rodar código que não cabe no servidor do Next.js (ex: webhooks de pagamento). Pode adicionar depois.

## Por que escolhemos Supabase

### vs Firebase (Google)
- Supabase usa PostgreSQL (open-source, padrão da indústria) vs Firestore (Google fechado)
- Você pode exportar seus dados a qualquer momento
- Mais barato em escala

### vs construir tudo do zero
- Você levaria semanas só pra fazer login funcionar direito
- Segurança é difícil de fazer bem; Supabase já cuida

### vs PocketBase, AppWrite, Convex
- Supabase tem maior comunidade brasileira
- Mais material em português
- Plano gratuito robusto (50 mil usuários, 500MB banco)

## O que você vê no Supabase Dashboard

Quando entra em https://supabase.com no seu projeto:

- **Table Editor**: ver suas tabelas, dados, editar linha a linha (igual planilha)
- **SQL Editor**: rodar comandos SQL direto (você usou aqui ao aplicar migrations)
- **Authentication**: lista de usuários, configuração de login
- **Storage**: arquivos enviados
- **Database**: detalhes técnicos do banco (extensões, triggers, etc.)
- **Logs**: o que está acontecendo (útil pra debugar)

## Por que tem 2 ambientes (dev e prod)

Você vai criar **2 projetos no Supabase**:
- **dev**: pra desenvolver (pode quebrar à vontade)
- **prod**: o real, com seus usuários reais

Nunca teste coisas novas direto em prod. Crie no dev, valida, depois aplica em prod.

(Pra começar, pode usar 1 só. Mas quando subir pra produção real, crie o segundo.)

## Limites do plano gratuito

Por mês:
- 50.000 usuários ativos (MAU)
- 500 MB de dados no banco
- 1 GB de transferência
- 2 projetos rodando

Pra maioria dos SaaS começando, sobra muito. Quando explodir, paga $25/mês pelo Pro (escala bem mais).

## O que NÃO é Supabase

- Não é hospedagem do seu app (Next.js). Pra isso usa Vercel ou EasyPanel.
- Não é serviço de envio de email transacional (use Resend).
- Não é processador de pagamento (use Stripe ou Mercado Pago).

## Próximo passo

Entenda o coração desse template: [02-como-funciona-multi-tenant](./02-como-funciona-multi-tenant.md).

---

## ❓ Travou? Peça ajuda

Se algo no Supabase Dashboard parece confuso, tira screenshot e manda pro Claude perguntando "o que é isso?". Ele te explica.
