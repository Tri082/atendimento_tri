# Rodando pela primeira vez

**Tempo de leitura:** ~15 min
**Pré-requisitos:** [Instalando tudo](./02-instalando-tudo.md) completo (Node.js + Supabase)
**O que você vai aprender:**
- Baixar o template
- Configurar o `.env.local` na mão
- Mudar o nome do app
- Aplicar o esquema do banco no Supabase
- Rodar o app localmente e fazer seu primeiro cadastro

---

## 1. Extrair o template e instalar dependências

Você recebeu um arquivo **`.zip`** do template. Vamos abrir ele e preparar o terreno.

### 1.1. Extrair o .zip

1. Localize o `.zip` que você baixou (geralmente vai pra pasta **Downloads**).
2. Clique direito → **Extrair tudo** (Windows) ou **abrir** (Mac — extrai sozinho).
3. Mova a pasta extraída pra um lugar fácil de achar (ex: **Desktop**) e renomeie pro nome do seu projeto (ex: `meu-saas`).

### 1.2. Abrir no editor

Recomendo o **VS Code** ([code.visualstudio.com](https://code.visualstudio.com)):

1. Abra o VS Code
2. **File → Open Folder** → selecione a pasta `meu-saas` que você acabou de criar
3. Abra o terminal integrado: **Terminal → New Terminal** (ou `Ctrl+\`` no Windows / `Cmd+\`` no Mac)

O terminal já abre **dentro da pasta certa** — você não precisa navegar pra lugar nenhum.

### 1.3. Instalar dependências

No terminal que você acabou de abrir, rode:

```bash
npm install
```

(Demora 1-3 minutos. Vai baixar todas as bibliotecas que o template usa.)

### 1.4. (Recomendado) Iniciar controle de versão com Git

Pra você poder voltar atrás se quebrar algo, e pra subir pro GitHub depois:

```bash
git init
git add .
git commit -m "primeiro commit"
```

Pronto — seu projeto agora tem histórico próprio.

## 2. Criar o `.env.local`

O `.env.local` é onde ficam as configurações secretas do seu app (chaves do Supabase, etc.). Ele **não vai pro GitHub** (o `.gitignore` já bloqueia).

Comece copiando o template que já vem no projeto:

**Mac/Linux:**
```bash
cp .env.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

**Windows (Explorador de arquivos):** clique direito em `.env.example` → Copiar → Colar → renomeie a cópia pra `.env.local`.

Agora abra o `.env.local` no seu editor (VS Code, Notepad, qualquer um).

## 3. Preencher as chaves do Supabase

No [passo 2 do guia anterior](./02-instalando-tudo.md) você anotou 3 coisas do Supabase. Cole elas nas linhas correspondentes do `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

> Mantenha as **aspas duplas** em volta de cada valor. Se você quiser tirar, tudo bem, mas é mais seguro com aspas (evita problema se a chave tiver caracteres especiais).

### Outras variáveis (pode deixar pra depois)

O `.env.example` traz mais variáveis comentadas. **Nenhuma é obrigatória pra rodar o app localmente.** Resumo:

- `SUPABASE_PROJECT_ID` — só precisa se for rodar `npm run types` (regerar os types do banco)
- `RESEND_API_KEY` / `EMAIL_FROM` — pra mandar email de verdade. Sem isso, o app loga o email no terminal (bom pra dev)
- `LLM_PROVIDER` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — pra ativar o chat com IA. **Leia o aviso dentro do `.env.example`** antes de colocar chave em produção (tem que setar cap de billing no provedor)
- `TRUST_PROXY` — só em produção, atrás de proxy reverso

Salve o arquivo.

## 4. (Opcional) Mudar o nome do app

Por padrão o app se chama "Elite da IA - Template". Pra trocar, abra `config/app.config.ts` e edite:

```ts
export const appConfig = {
  /** Nome do seu app (aparece em metadata, header, footer, emails). */
  name: "Meu SaaS",   // ← aqui

  /** Descrição curta usada em metadata HTML e emails. */
  description: "Descrição curta do que seu app faz",
  // ...
}
```

Esse nome aparece no título da aba do navegador, no header da landing, no footer e nos emails que o app envia.

## 5. Aplicar as migrations do banco no Supabase

O template traz o esquema completo dividido em migrations sequenciais em `supabase/migrations/` (~21 arquivos `.sql`, numerados na ordem em que devem ser aplicados). Cada um cria um pedaço do banco — tabelas, policies de segurança (RLS), triggers e funções.

Você tem **dois caminhos**, escolhe o que for mais confortável:

### Caminho A — Supabase CLI (recomendado, 1 comando)

Se você já tem o Supabase CLI instalado:

```bash
# Liga este projeto ao seu projeto Supabase (só na primeira vez)
supabase link --project-ref SEU_PROJECT_ID

# Aplica todas as migrations de uma vez
supabase db push
```

> O `--project-ref` é o ID do seu projeto Supabase (aparece na URL do painel: `https://supabase.com/dashboard/project/SEU_PROJECT_ID`).
>
> Não tem o CLI? Instala com `npm install -g supabase` ou veja [as outras opções](https://supabase.com/docs/guides/local-development/cli/getting-started).

### Caminho B — SQL Editor (manual, sem instalar nada)

1. No seu projeto Supabase, vá em **SQL Editor** (ícone de banco de dados na lateral)
2. Pra cada arquivo em `supabase/migrations/` na ordem (do menor número pro maior):
   - Abra o `.sql` no seu editor (VS Code, Notepad, qualquer um)
   - Selecione tudo (`Ctrl+A`) e copie (`Ctrl+C`)
   - No SQL Editor, clique em **New query**, cole, e clique em **Run**
   - Espere ver "Success" embaixo, depois passe pro próximo arquivo

> 💡 **De agora em diante**, qualquer mudança no banco (criar tabela, alterar coluna) vira uma **migration nova** em `supabase/migrations/`. O Claude Code cria o arquivo lá pra você, e você aplica só ele (via `supabase db push` ou colando no SQL Editor).
>
> Tem um arquivo `_TEMPLATE_org_scoped_table.sql.example` nessa pasta como referência do padrão de tabela escopada por org.
>
> Precisa **zerar o banco** em dev pra reaplicar do zero? Cole `supabase/reset-dev.sql` no SQL Editor → Run → e depois reaplique as migrations.

## 6. Rodar o app

```bash
npm run dev
```

Vai aparecer:

```
▲ Next.js 16.x.x
- Local: http://localhost:3000
✓ Ready in 138ms
```

Abra http://localhost:3000 no seu navegador.

## 7. Fazer seu primeiro cadastro

1. Na landing, clica em **Começar agora**
2. Preenche nome, email **real seu** e senha (mín 8 caracteres)
3. Clica em **Criar conta**
4. Vai aparecer "Confira seu email"
5. Abre seu email e clica no link de confirmação
6. Volta pro app — vai redirecionar pra **Criar workspace**
7. Digite o nome do seu primeiro workspace (ex: "Minha Empresa") → **Criar workspace**
8. Voilà! Tá no dashboard.

## O que você acabou de fazer

- ✅ Tem um app web rodando no seu computador
- ✅ Conta criada no Supabase
- ✅ Workspace criado
- ✅ Acesso ao dashboard com KPIs de exemplo

Agora você pode começar a customizar.

## Próximo passo

Aprenda a usar o Claude Code pra construir suas funcionalidades em [04-conhecendo-claude-code](./04-conhecendo-claude-code.md).

---

## ❓ Travou? Peça ajuda

Erros comuns:
- **"Failed to fetch" / "Invalid API key"**: as chaves no `.env.local` estão erradas. Confere se copiou a `anon key` e a `service_role key` certas (cuidado pra não trocar uma pela outra) e se reiniciou o `npm run dev` depois de editar o `.env.local`.
- **"relation does not exist" / "table not found"**: migrations não foram aplicadas (ou ordem errada). Rode todas em ordem no SQL Editor.
- **Email não chegou**: cheque spam. Ou desabilite confirmação em Supabase → Authentication → Email Auth → "Confirm email" → desabilita.
- **`.env.local` não tá sendo lido**: o Next.js só lê o `.env.local` quando o `npm run dev` **inicia**. Se você editou com o servidor rodando, derruba (Ctrl+C) e roda `npm run dev` de novo.

Cole o erro exato pro Claude Code e descreve o que estava tentando fazer.
