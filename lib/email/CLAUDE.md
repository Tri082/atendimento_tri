# CLAUDE.md — lib/email

## Responsabilidade

Abstração de envio de emails transacionais. Permite trocar de provider sem refactor de código de domínio.

## Interface

```typescript
import { getEmailProvider } from "@/lib/email";

const provider = getEmailProvider();
const result = await provider.send({
  to: "user@example.com",
  subject: "Olá",
  react: <MeuTemplate />,
});
```

`result.ok === true` → enviado. `result.ok === false` → ver `result.error`.

## Providers disponíveis

- **`resend`** (recomendado em produção): `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` no env. Cadastre em https://resend.com
- **`console` (fallback dev)**: padrão quando RESEND_API_KEY não está setada. Loga o email no terminal em vez de enviar. **NÃO usar em produção** — emails não chegam.

Para troca de provider real, edite `EMAIL_PROVIDER` no env.

## Como criar um novo template

1. Crie `lib/email/templates/<nome>.tsx`
2. Use componentes do `@react-email/components` (Html, Head, Body, Container, Heading, Text, Button, Section, Link, Preview)
3. Estilo do tema (verde Kawasaki em fundo escuro):
   - Background: `#0a0a0a`, texto: `#d4d4d4`, accent: `#52d12f`
4. Exporte como default
5. Use no chamador:
   ```typescript
   import { MeuTemplate } from "@/lib/email/templates/meu-template";
   await provider.send({ to, subject, react: <MeuTemplate {...props} /> });
   ```

## Como adicionar um adapter novo (ex: SendGrid)

1. Crie `lib/email/adapters/<provider>.ts` exportando classe que implementa `EmailProvider`
2. Adicione branch em `lib/email/index.ts` `getEmailProvider()` baseado em `EMAIL_PROVIDER`
3. Documente env vars necessárias em `.env.example`

## Regras

- **Toda chamada de `.send()` DEVE checar `result.ok`** — emails podem falhar silenciosamente
- **Não bloqueie a Server Action** se email falhar (loga, retorna sucesso da operação principal)
- **Não inclua dados sensíveis (tokens) no Subject** — só no body
