import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const user = String(req.query.user || "").toLowerCase();
  if (!/^[a-z0-9_-]{1,30}$/.test(user)) {
    return res.status(400).json({ error: "Nome inválido" });
  }
  const key = `treino:${user}`;

  try {
    if (req.method === "GET") {
      const data = await redis.get(key);
      return res.status(200).json({ data: data ?? null });
    }
    if (req.method === "PUT") {
      const data = req.body?.data;
      if (!data || typeof data !== "object" || JSON.stringify(data).length > 100000) {
        return res.status(400).json({ error: "Dados inválidos" });
      }
      await redis.set(key, data);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Método não permitido" });
  } catch {
    return res.status(500).json({ error: "Erro ao falar com o banco" });
  }
}
