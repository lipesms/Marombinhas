import { Redis } from "@upstash/redis";

// Base global de exercícios: um único documento { items: [...] } para todo mundo
export function makeHandler(redis) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    const key = "base:global";
    try {
      if (req.method === "GET") {
        const data = await redis.get(key);
        return res.status(200).json({ data: data ?? null });
      }
      if (req.method === "PUT") {
        const data = req.body?.data;
        if (!data || !Array.isArray(data.items) || JSON.stringify(data).length > 300000) {
          return res.status(400).json({ error: "Dados inválidos" });
        }
        await redis.set(key, data);
        return res.status(200).json({ ok: true });
      }
      return res.status(405).json({ error: "Método não permitido" });
    } catch {
      return res.status(500).json({ error: "Erro ao falar com o banco" });
    }
  };
}

export default makeHandler(
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  })
);
