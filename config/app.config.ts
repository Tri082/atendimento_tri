/**
 * Configuração central do seu app.
 *
 * Mude aqui pra customizar identidade, features e branding.
 * Tudo é type-safe — Claude Code te ajuda a manter consistente.
 */

export const appConfig = {
  /** Nome do seu app (aparece em metadata, header, footer, emails). */
  name: "Elite da IA - Template",

  /** Descrição curta usada em metadata HTML e emails. */
  description: "Template SaaS para construir seu produto com Claude Code",

  /** URL pública do app em produção (sem trailing slash). */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  /** Cor accent (verde Kawasaki por padrão). Aplicada via CSS variables — só pra referência. */
  brand: {
    primaryColor: "verde-kawasaki",
  },

  /** Flags pra habilitar/desabilitar funcionalidades grandes. */
  features: {
    /** Permite múltiplos workspaces por user. Sem isso, force 1 org por user. */
    multipleOrganizations: true,
    /** Habilita uploads para Supabase Storage (avatars/logos). */
    storage: true,
  },

  /** Email de contato/from (usado em emails transacionais). */
  email: {
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    supportEmail: "suporte@example.com",
  },
} as const;

export type AppConfig = typeof appConfig;
