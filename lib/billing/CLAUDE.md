# CLAUDE.md — lib/billing (placeholder)

## Status

Esta pasta está **planejada para uma release futura** (v1.2).

Vai conter integração Stripe (subscriptions + checkout) com tabelas `plans` e `subscriptions` no Supabase + webhook handler.

## Padrão planejado

```typescript
// lib/billing/stripe.ts → cliente Stripe + helpers
// lib/billing/actions.ts → Server Actions: createCheckout, openPortal, syncSubscription
// app/api/webhooks/stripe/route.ts → webhook handler
// supabase/migrations/<future>_billing.sql → plans, subscriptions, customer mapping
```

## Por que ainda não está pronto

Billing é decisão de produto que depende do plano de monetização do aluno. Adicionar Stripe "vazio" sem casos de uso reais polui o template. Quando vier, virá com 1 ou 2 exemplos de produto (assinatura mensal simples e plano com features-gated).
