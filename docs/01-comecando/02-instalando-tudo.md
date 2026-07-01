# Instalando tudo

**Tempo de leitura:** ~15 min
**Pré-requisitos:** computador com acesso à internet
**O que você vai aprender:**
- Instalar Node.js
- Criar conta no Supabase
- Criar projeto Supabase
- (Opcional) Criar conta Resend pra envio de email
- (Opcional) Criar conta no EasyPanel pra deploy

---

## 1. Instalar Node.js (obrigatório)

Node.js é o ambiente que faz o app rodar no seu computador.

### Mac/Linux

Abra o terminal e cole:

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Feche e reabra o terminal. Depois:

```bash
fnm install 22
fnm use 22
```

### Windows

Baixe o instalador em https://nodejs.org/ — escolha a versão LTS (recomendada). Clique no `.msi`, próximo, próximo, instalar.

### Validando

No terminal, digite:

```bash
node --version
```

Deve aparecer algo como `v22.x.x`. Se aparecer "command not found", a instalação não deu certo — peça ajuda ao Claude.

## 2. Conta Supabase (obrigatório)

Supabase é onde fica seu banco de dados + login + arquivos.

1. Vá em https://supabase.com → "Start your project" → cadastre-se (pode usar conta Google ou GitHub)
2. Clique em "New Project" no dashboard
3. Preencha:
   - **Name**: nome do seu projeto (ex: "meu-saas-dev")
   - **Database password**: senha forte. **ANOTE!** Você não vai usar agora, mas pode precisar depois.
   - **Region**: escolha a mais próxima (sa-east-1 = São Paulo)
   - **Plan**: Free (suficiente pra começar — até 50 mil usuários)
4. Clique em "Create new project" e espere ~2 minutos

Quando estiver pronto, vá em **Settings → API** e anote 3 coisas:
- **Project URL**: tipo `https://xxxxx.supabase.co`
- **anon (public) key**: começa com `eyJ...`
- **service_role key**: começa com `eyJ...` (CUIDADO — é secreta!)

Você vai precisar dessas 3 coisas no próximo guia.

## 3. (Opcional) Resend pra envio de email

Resend é um serviço pra enviar email transacional (convites, recuperação de senha). **Sem ele**, o template usa um modo "fallback" que apenas mostra o email no terminal — bom pra desenvolver, ruim pra produção.

1. Vá em https://resend.com → "Sign up" gratuito (3.000 emails/mês)
2. Verifique seu email
3. Em "API Keys", clique "Create API Key" — escolha "Full access" (vamos restringir depois)
4. Anote a chave (começa com `re_...`)
5. Em "Domains" → "Add Domain" — adicione um domínio que VOCÊ controla. **Sem isso, Resend só envia emails pro seu próprio email cadastrado.**

(Pode deixar pra depois se não tem domínio agora.)

## 4. (Opcional) EasyPanel pra deploy

Quando seu app estiver pronto, você vai colocar no ar numa VPS. EasyPanel facilita.

1. Compre uma VPS (Hetzner, Hostinger, DigitalOcean — recomendado: VPS 4GB RAM, ~R$ 30/mês)
2. Siga o instalador do EasyPanel em https://easypanel.io
3. Pronto — você usa depois quando for publicar o app

(Não precisa agora — só na hora de subir pro ar.)

## 5. (Recomendado) Git + GitHub

Pra controlar versões do código e poder fazer deploy via "git push":

1. Instale Git: https://git-scm.com/downloads
2. Crie conta no GitHub: https://github.com (gratuito)

## Validando tudo

Cheque que tudo funciona:

```bash
node --version       # v22.x.x
npm --version        # 10.x.x ou superior
git --version        # git version 2.x.x
```

Se tudo apareceu, está pronto pra próximo passo.

## Próximo passo

Vai pra [03-rodando-pela-primeira-vez](./03-rodando-pela-primeira-vez.md).

---

## ❓ Travou? Peça ajuda

Abra o Claude Code e digite:
> "Não consegui instalar [o que]. Recebi esse erro: [cole o erro]"

Ou cole o erro pro Claude e descreve o que tava tentando fazer.
