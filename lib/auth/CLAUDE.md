# CLAUDE.md — lib/auth

## Responsabilidade

Camada de autenticação. Fornece:
- Server Actions de signup/signin/signout/reset password
- Guards usados em RSC e Server Actions pra proteger rotas

## Guards disponíveis

Definidos em `lib/auth/guards.ts`:

### `requireUser()`
Retorna `User` ou redireciona pra `/login`. Use em rotas que precisam de auth mas não dependem de org.

```typescript
import { requireUser } from "@/lib/auth/guards";

export default async function Page() {
  const user = await requireUser();
  return <div>Olá, {user.email}</div>;
}
```

### `getCurrentUser()`
Retorna `User | null` sem redirect. Use quando o comportamento muda baseado em estar logado ou não.

### `requireOrgMember({ orgSlug })`
Retorna `{ user, org, role }`. Redireciona se user não for membro da org indicada pelo slug.

**OBRIGATÓRIO em toda página dentro de `/app/[orgSlug]/`.**

```typescript
import { requireOrgMember } from "@/lib/auth/guards";

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireOrgMember({ orgSlug });
  // ...
}
```

### `requireOrgRole({ orgSlug, roles })`
Como `requireOrgMember`, mas valida que o role do user está na lista permitida. Redireciona pra `/dashboard` da org se não tiver permissão.

Use em páginas de settings que só admin/owner podem acessar.

```typescript
const { user, org } = await requireOrgRole({
  orgSlug,
  roles: ["owner", "admin"],
});
```

## Server Actions

Definidas em `lib/auth/actions.ts`. Todas seguem o padrão:

```typescript
type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };
```

Sempre tratamos erros e traduzimos pra PT-BR (ver `traduzirErroSupabase` na própria action).

## Como criar uma nova action

1. Defina schema Zod em `lib/auth/schemas.ts` (ou pasta de domínio específica)
2. Marque o arquivo com `"use server";` no topo
3. Valide input com `schema.safeParse()`
4. Use `await createClient()` de `@/lib/supabase/server`
5. Retorne `ActionResult` — nunca exception não-tratada
6. Se modificar dados, chame `revalidatePath()` no final

## Onde NÃO usar guards

- Em Client Components (são server-only)
- Em rotas estáticas / API públicas
- No middleware (use `updateSession` direto)

## Public paths

Rotas que NÃO requerem auth (definidas em `middleware.ts`):
`/`, `/login`, `/signup`, `/reset-password*`, `/verify-email`, `/auth/*`

## Regras absolutas

### Senhas
- **Mínimo 10 caracteres** — definido em `lib/auth/schemas.ts`. Não relaxe sem aprovação.

### Signup
- **NUNCA confirme se um email já está cadastrado.** Mesmo retorno genérico pra email novo e email existente. Evita user enumeration (atacante descobrir quem é cliente da plataforma).

### Redirects pós-auth
- **Toda redirect baseado em `next` query param valida** contra `//evil.com`, `/\\evil.com`, encoded variants. Use o helper `safeNext` (já implementado). Sem isso, atacante envia link com `?next=//evil.com` e usuário logado é jogado pra fora.

### Mensagens de erro
- **Nunca devolva `error.message` cru do Supabase pro client.** Traduz pra mensagem leiga em PT-BR (ver `traduzirErroSupabase` na action). Loga server-side com `console.error` pra debug.
