# Configurando VPS + EasyPanel

**Tempo de leitura:** ~15 min
**Pré-requisitos:** [01-preparando-para-publicar](./01-preparando-para-publicar.md)
**O que você vai aprender:**
- Contratar VPS (recomendado: Hetzner ou Hostinger)
- Instalar EasyPanel
- Criar seu app no EasyPanel apontando pro repositório

---

## 1. Contratar VPS

### Hetzner (recomendado pra economia)

1. Cadastre em https://www.hetzner.com (cuidado: precisa de cartão internacional)
2. Vá em Cloud → Servers → New Server
3. Escolha:
   - **Location**: Helsinki ou Falkenstein (mais barato; Brasil não tem)
   - **Image**: Ubuntu 24.04 LTS
   - **Type**: CX22 (4GB RAM, ~€7/mês = R$ 38)
   - **SSH Key**: adicione sua chave pública (cria com `ssh-keygen` se não tem)
4. Cria

### Hostinger (mais fácil pra brasileiro, paga em real)

1. https://www.hostinger.com.br → VPS Hosting
2. Plano KVM 2 (4GB RAM, ~R$ 40/mês com promoção)
3. Sistema: Ubuntu 24.04

### Outras opções

- DigitalOcean ($24/mês 4GB)
- Vultr (~$24/mês 4GB)
- Linode (~$24/mês 4GB)

## 2. Conectar via SSH

Depois de criar a VPS, você recebe um IP (tipo `123.456.789.012`).

Mac/Linux:
```bash
ssh root@123.456.789.012
```

Windows: instale PuTTY ou use Windows Terminal:
```bash
ssh root@123.456.789.012
```

(Senha vem por email da Hetzner/Hostinger. Mude assim que entrar.)

## 3. Instalar EasyPanel

Já conectado via SSH:

```bash
curl -sSL https://get.easypanel.io | sh
```

Espera ~5 min. No fim mostra um link tipo `http://123.456.789.012:3000`. Acessa no navegador.

## 4. Cadastrar no EasyPanel

Primeira vez você cria conta admin. **Anote senha forte**.

## 5. Configurar Docker Compose template (uma vez)

EasyPanel detecta Dockerfile automaticamente. Você não precisa configurar Docker manualmente — EasyPanel faz.

## 6. Criar seu app no EasyPanel

### 6.1. Criar projeto

Painel → "+ Create project" → dê um nome (ex: `meu-saas`)

### 6.2. Adicionar app dentro do projeto

Dentro do projeto → "+ Add service" → "App"

### 6.3. Conectar com Git

Em "Source", escolha **Git** (não Image).

- **Owner & Repo**: `seu-usuario/template-alunos`
- **Branch**: `main`
- **Build Path**: `/`
- Se o repo é privado, conecte sua conta GitHub clicando em "Authenticate"

### 6.4. Build & Deploy

EasyPanel detecta `Dockerfile` na raiz e usa.

### 6.5. Environment Variables

Aba "Environment":

Cole as vars que estão em `.env.local`, mas **trocando**:
- `NEXT_PUBLIC_SUPABASE_URL`: do projeto Supabase de **produção** (não dev!)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: idem
- `SUPABASE_SERVICE_ROLE_KEY`: idem
- `NEXT_PUBLIC_APP_URL`: `https://seu-dominio.com.br` (vamos configurar domínio no próximo guia)
- `RESEND_API_KEY`: a chave Resend (se vai usar email)
- `EMAIL_PROVIDER`: `resend`
- `EMAIL_FROM`: `Seu App <noreply@seu-dominio.com.br>`

### 6.6. Domain

Aba "Domains":

Por enquanto pode usar o subdomínio que o EasyPanel oferece (tipo `meu-saas-123.easypanel.app`). Vamos configurar domínio próprio no próximo guia.

### 6.7. Resources

Aba "Resources":

Padrão tá bom (256MB RAM). Aumente se notar lentidão.

### 6.8. Deploy

Botão **Deploy**. EasyPanel:
1. Clona o repo
2. Builda o Dockerfile (~3-5 min na primeira vez)
3. Roda o container
4. Mostra logs

Acompanha em "Logs" se der erro.

## 7. Configurar Supabase Auth pra produção

No painel do **Supabase de produção** (não dev):

1. Authentication → URL Configuration
2. **Site URL**: cola seu domínio (ex: `https://meu-saas.easypanel.app` por enquanto)
3. **Redirect URLs**: adiciona `https://meu-saas.easypanel.app/**`

Sem isso, login funciona mas redirects quebram.

## 8. Validar

Abre seu domínio (ou subdomínio do EasyPanel) no navegador:
- Landing carrega? ✓
- Signup funciona? ✓
- Email chega (se Resend configurado)? ✓
- Pode entrar no dashboard? ✓

Se algo quebrou, abre o terminal e cola o erro pro Claude com o contexto do que tava fazendo.

## Auto-deploy quando faz git push

Em "Settings" do app no EasyPanel, ative **Auto-deploy on Git push**. Cada push pra `main` rebuilda automaticamente.

## Próximo passo

[03-dominio-proprio-e-ssl](./03-dominio-proprio-e-ssl.md).

---

## ❓ Travou? Peça ajuda

Erros comuns:
- **Build falhou**: ver logs no EasyPanel; geralmente é env var faltando
- **Container rebooting**: ver logs; geralmente erro em runtime
- **Auth não funciona**: Supabase URL Configuration tá errada

Cole o erro exato pro Claude e descreve o que tava fazendo.
