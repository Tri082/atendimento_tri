-- Conta tentativas consecutivas sem entender a resposta do cliente num mesmo
-- step do roteiro. Sem isso, uma resposta que não bate com nenhuma opção fazia
-- o roteiro reenviar a mesma pergunta indefinidamente a cada nova mensagem do
-- cliente — ruim pra experiência e um padrão de conteúdo repetido em rajada
-- que sistemas antifraude do WhatsApp podem flagar como automação.
alter table conversation_onboarding
  add column retry_count integer not null default 0;
