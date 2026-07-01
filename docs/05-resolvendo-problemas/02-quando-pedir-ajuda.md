# Quando pedir ajuda

**Tempo de leitura:** ~5 min
**O que você vai aprender:**
- Quando descrever um problema técnico pro Claude
- Quando pedir uma feature nova pro Claude
- Quando perguntar pra humano (suporte do curso)

---

## Descreve o problema pro Claude quando:

- Apareceu uma mensagem de erro
- Funcionalidade parou de funcionar (clica e nada acontece)
- Dado não aparece quando deveria
- Build/typecheck falhou
- App tá lento de repente

Claude vai investigar com calma — não chutar fix. **Cole a mensagem de erro completa** e descreve o passo-a-passo do que tava fazendo.

## Pede uma feature nova quando:

- Você quer adicionar algo novo no app
- Você quer mudar comportamento existente (ex: "agora cada produto tem categoria")
- Você quer integrar algo externo (API, serviço)

Fale em PT-BR como descrito em [02-criando-funcionalidades](../02-criando-funcionalidades/01-pedindo-uma-nova-funcionalidade.md).

## Pergunte em linguagem natural quando:

- Você quer **entender** algo (sem pedir mudança)
  > "Me explica como funciona a tabela de memberships?"
- Você quer **decidir** entre opções
  > "Vou criar uma loja online aqui ou faz mais sentido usar Shopify?"
- Você quer **revisar** o que tem
  > "Lê meu código e me diz se tem algo que parece feio ou inseguro"

## Pergunte pra um humano (suporte do curso ou comunidade) quando:

- O problema NÃO é técnico — é estratégico ("vale a pena cobrar X reais?")
- Você está **bloqueado emocionalmente** e precisa desabafar
- Tem dúvida sobre o **curso em si**
- Quer feedback **subjetivo** ("isso aqui ficou bom?")

Claude é ótimo em código, mas não te conhece como pessoa. Conversa humana resolve coisas diferentes.

## Quando algo "parece errado" mas não tem erro

Às vezes não tem mensagem nenhuma, mas você sente que algo está estranho. Tipo: "o app está lento demais", ou "tá feio mas não sei o quê".

**Use:** pergunta natural pro Claude, com contexto.

Exemplo:
> "A página de membros tá lenta — demora uns 3 segundos pra carregar. Tem 5 membros só. Investiga porque?"

Claude vai medir, analisar e te dar uma resposta concreta.

## Como descrever um problema bem

Receita:
1. **O que eu fiz**: passo a passo do que cliquei/digitei
2. **O que eu esperava**: o que era pra acontecer
3. **O que aconteceu**: o que de fato aconteceu (com print/erro se possível)
4. **O que eu já tentei**: pra não fazer Claude tentar a mesma coisa

Exemplo completo:
> "Cliquei em 'Convidar membro' no /settings/members, digitei 'amigo@email.com' e cliquei 'Enviar'. Esperava que aparecesse na lista de convites pendentes. Apareceu mensagem vermelha 'Erro: violates row-level security policy'. Reload da página não mudou nada. Logs do terminal: 'PostgrestError ... violates RLS'. Não sei se a RLS tá certa."

## O que NÃO pedir pro Claude

- Senha forte aleatória (use 1Password ou Bitwarden)
- Conselho de vida ou terapia
- Decisões éticas sobre seu produto
- Conselho jurídico (LGPD, direitos autorais, etc.)

## Próximo passo

Volta pra [01-comecando](../01-comecando/) ou explora as outras pastas. Você tem agora todo conhecimento pra construir seu produto!

---

## ❓ Travou?

Pergunta pro Claude em PT-BR coloquial. Cola o erro, descreve o que tava fazendo. Você sempre pode.
