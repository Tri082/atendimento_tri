# Erros comuns

**Tempo de leitura:** ~10 min
**Pré-requisitos:** nenhum
**O que você vai aprender:**
- Os 10 erros mais comuns + soluções
- Como ler stack trace
- Quando reiniciar dev server

---

## 1. "relation does not exist" (Supabase)

**Mensagem:** `relation "public.<tabela>" does not exist`

**Causa:** você está consultando uma tabela que não existe no Supabase. Geralmente porque migrations não foram aplicadas (ou faltou alguma).

**Solução:**
1. Vá em https://supabase.com → seu projeto → Database → Tables
2. Veja quais tabelas tem
3. Compare com `supabase/migrations/` no projeto
4. Aplique as migrations que faltam, em ordem, no SQL Editor

## 2. "Failed to fetch" no signup/login

**Causa:** keys do Supabase no `.env.local` estão erradas ou faltando.

**Solução:**
1. Confere `.env.local` — tem as 3 variáveis Supabase?
2. As keys batem com o que está em Supabase → Settings → API?
3. Reinicia `npm run dev`

## 3. Typecheck falhou após mudar schema

**Mensagem:** `Property 'X' does not exist on type 'Y'`

**Causa:** você adicionou/removeu colunas no banco mas não regenerou os tipos.

**Solução:**
```bash
npm run types
```

## 4. "Email rate limit exceeded"

**Causa:** Supabase Free tem limite de ~30 emails/hora por projeto. Você atingiu.

**Solução:**
- Espera 1 hora
- Ou configura SMTP próprio em Supabase → Authentication → Email Templates → SMTP Settings
- Ou usa Resend (mais flexível)

## 5. Build local funciona, deploy falha

**Causa:** geralmente diferenças de env entre local e produção (Linux vs Mac), ou variável faltando no EasyPanel.

**Solução:**
1. Veja logs do deploy no EasyPanel
2. Compare env vars do `.env.local` com as do painel EasyPanel
3. Procure por TypeScript ou node version mismatch

## 6. Login funciona mas redirect quebra

**Mensagem:** redireciona pra URL errada (localhost em produção, ou erro 404)

**Causa:** `NEXT_PUBLIC_APP_URL` errado OU Supabase URL Configuration desalinhada.

**Solução:**
1. EasyPanel → Environment → `NEXT_PUBLIC_APP_URL` deve ser o domínio HTTPS real
2. Supabase prod → Authentication → URL Configuration → Site URL e Redirect URLs com o domínio real

## 7. CSS quebrado / sem estilo

**Causa:** geralmente é cache do navegador OU build do Tailwind quebrou.

**Solução:**
1. Hard refresh no navegador (Cmd+Shift+R no Mac, Ctrl+Shift+R no Win/Linux)
2. Se persistir: `rm -rf .next` e `npm run dev` de novo

## 8. "Cannot find module '@/...'"

**Causa:** path alias quebrou OU você usou import errado.

**Solução:**
1. Verifica `tsconfig.json` tem `"paths": { "@/*": ["./*"] }`
2. Restart TypeScript no editor (VSCode: Cmd+Shift+P → "Restart TS Server")

## 9. Hydration mismatch

**Mensagem:** `Hydration failed because the initial UI does not match what was rendered on the server`

**Causa:** algo no Client Component depende de `window`, `localStorage`, ou randomização — coisas que não existem no servidor.

**Solução:**
1. Use `useEffect` pra coisas que só rodam no cliente
2. Use `suppressHydrationWarning` em casos específicos (ex: tema)
3. Pergunta pro Claude — esse tipo de bug exige análise

## 10. RLS bloqueando query

**Mensagem:** consulta retorna `[]` (vazio) mas você tem dados, OU `permission denied for table X`

**Causa:** Row Level Security está protegendo. Você não tem permissão de ler/escrever.

**Solução:**
1. Verifica que está logado E é membro da org
2. Verifica policies no Supabase → Authentication → Policies
3. Se for legítimo, peça pro Claude ajustar a policy. Não desabilita RLS — corrige.

## Como ler stack trace

Quando aparece erro grande tipo:

```
Error: Cannot read property 'name' of undefined
    at MyPage (/app/(app)/app/[orgSlug]/page.tsx:24:18)
    at ... (mil linhas)
```

Foca na **primeira linha do seu código** (não de `node_modules`). Aqui é `app/(app)/app/[orgSlug]/page.tsx:24`. Abre esse arquivo na linha 24 — algo lá está `undefined` quando você acessa `.name`.

## Quando reiniciar dev server

Reinicie (`Ctrl+C` no terminal e `npm run dev` de novo) quando:
- Mudou `.env.local`
- Mudou `next.config.ts`
- Mudou `package.json` (após `npm install`)
- Tudo parece confuso e não faz sentido

## Próximo passo

[02-quando-pedir-ajuda](./02-quando-pedir-ajuda.md).

---

## ❓ Travou? Peça ajuda

Cole a mensagem completa pro Claude e descreve o que tava fazendo.
