# Domínio próprio + SSL

**Tempo de leitura:** ~10 min
**Pré-requisitos:** [02-configurando-vps-easypanel](./02-configurando-vps-easypanel.md)
**O que você vai aprender:**
- Comprar um domínio
- Apontar DNS pra sua VPS
- Configurar no EasyPanel
- SSL automático via Let's Encrypt

---

## 1. Comprar domínio

### Registro.br (pra .com.br)

1. https://registro.br → busca o nome que quer
2. Cria conta com CPF/CNPJ
3. Paga ~R$ 50/ano (pode pagar 5 anos pra dar desconto)

### Outras (pra .com, .io, .app, etc.)

- Cloudflare Registrar (preços de atacado)
- Namecheap
- GoDaddy (mais caro)

## 2. Apontar DNS pra sua VPS

Você precisa do **IP da sua VPS** (no painel da Hetzner/Hostinger).

### No painel do registrador (Registro.br exemplo)

1. Login → seus domínios → seu-dominio.com.br
2. "Editar zona DNS"
3. Adicione **2 registros**:

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | @ | 123.456.789.012 | 3600 |
| A | www | 123.456.789.012 | 3600 |

(Substitui pelo IP real da sua VPS.)

Esse `@` significa "domínio raiz" (seu-dominio.com.br). O `www` é só pra quem digita www na frente.

### Propagação

DNS demora pra propagar — de 5 minutos a 24 horas. Pra testar:

```bash
dig seu-dominio.com.br
```

Vai mostrar pra qual IP está apontando. Quando aparecer o seu IP, tá propagado.

## 3. Configurar no EasyPanel

Voltando no EasyPanel:

1. Seu app → aba **Domains**
2. **+ Add Domain**
3. Digite `seu-dominio.com.br`
4. Marca "HTTPS" (SSL)
5. Save

Repete pra `www.seu-dominio.com.br` se quiser cobrir os 2.

## 4. SSL automático

EasyPanel usa **Let's Encrypt** pra gerar SSL grátis automaticamente. Em ~30 segundos depois de adicionar o domínio, o SSL aparece.

Se falhar, geralmente é porque DNS ainda não propagou. Espera mais e tenta de novo.

## 5. Atualizar config

Agora que tem domínio real, atualize 2 lugares:

### `NEXT_PUBLIC_APP_URL` no EasyPanel

Em **Environment** do seu app, mude:
- `NEXT_PUBLIC_APP_URL` = `https://seu-dominio.com.br`

Faça redeploy.

### Supabase Auth URL Configuration

No painel do Supabase de produção → Authentication → URL Configuration:
- **Site URL**: `https://seu-dominio.com.br`
- **Redirect URLs**: adiciona `https://seu-dominio.com.br/**`

## 6. Validar tudo

Abra `https://seu-dominio.com.br`:
- Cadeado verde ao lado? ✓ SSL funcionando
- Página carrega? ✓
- Signup → email chega? ✓ Resend OK
- Link do email manda pra `https://seu-dominio.com.br/...`? ✓ Supabase URL Config OK

## 7. (Opcional) Redirect www → não-www

Pra evitar duplicação, você pode ter só `seu-dominio.com.br` (sem www) e redirecionar quem digita `www` pra versão sem.

No EasyPanel, adicione regra de redirect (Settings → Redirects):
- De: `www.seu-dominio.com.br`
- Pra: `https://seu-dominio.com.br`
- Tipo: 301 (permanente)

## Custo total

- Domínio: ~R$ 50/ano
- SSL: GRÁTIS (Let's Encrypt)
- Mesmo IP/VPS, mesmo EasyPanel

## E se eu quiser usar subdomínio (app.seu-dominio.com.br)

Igual, só muda o nome do registro DNS:

| Tipo | Nome | Valor |
|---|---|---|
| A | app | 123.456.789.012 |

E no EasyPanel adiciona `app.seu-dominio.com.br`.

Útil quando o domínio raiz já é seu site institucional (Wordpress ou outra coisa).

## Próximo passo

Você terminou! Seu app está no ar com domínio próprio + SSL.

Próximos guides são sobre **resolver problemas** quando algo der errado: [05-resolvendo-problemas](../05-resolvendo-problemas/01-erros-comuns.md).

---

## ❓ Travou? Peça ajuda

Erros comuns:
- **SSL não gera**: DNS ainda não propagou — espera mais
- **Site abre mas mostra "Hello from EasyPanel"**: seu app não bindou no domínio. Confere "Domains" do app.
- **Email com link errado**: `NEXT_PUBLIC_APP_URL` no env ainda é localhost ou subdomínio antigo.

Cole o problema exato pro Claude.
