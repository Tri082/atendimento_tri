import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const EMBED_MODEL = "text-embedding-3-small";  // 1536 dims

function getEmbeddingProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não está setada. RAG precisa de embeddings da OpenAI mesmo se o LLM principal for outro. Cadastre em https://platform.openai.com/api-keys.",
    );
  }
  return createOpenAI({ apiKey });
}

/** Gera embedding de 1 texto. Retorna number[] de 1536 dims. */
export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  const { embedding } = await embed({
    model: provider.embedding(EMBED_MODEL),
    value: text.slice(0, 8000),  // text-embedding-3-small limite 8191 tokens; truncamos por safety
  });
  return embedding;
}

/** Gera embeddings em batch. OpenAI suporta até 2048 inputs por chamada, batch=20 é conservador. */
export async function embedMany_(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = getEmbeddingProvider();
  const { embeddings } = await embedMany({
    model: provider.embedding(EMBED_MODEL),
    values: texts.map((t) => t.slice(0, 8000)),
  });
  return embeddings;
}
