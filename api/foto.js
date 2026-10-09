import { Redis } from "@upstash/redis";

// Fotos dos exercícios: cada foto é um JPEG pequeno guardado no Redis e servido como imagem.
// O app já reduz a foto antes de enviar (~480px), então cada uma fica com poucas dezenas de KB.
const ID = /^[a-z0-9]{6,40}$/;
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

export function makeHandler(redis) {
  return async function handler(req, res) {
    const id = String(req.query.id || "").toLowerCase();
    if (!ID.test(id)) return res.status(400).json({ error: "Id inválido" });
    const key = `foto:${id}`;

    try {
      if (req.method === "GET") {
        const data = await redis.get(key);
        if (typeof data !== "string") return res.status(404).end();
        res.setHeader("Content-Type", "image/jpeg");
        // o id muda a cada foto nova, então pode ficar em cache "para sempre"
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.status(200).send(Buffer.from(data.split(",")[1], "base64"));
      }
      if (req.method === "PUT") {
        const data = req.body?.data;
        if (typeof data !== "string" || data.length > 200000 || !JPEG.test(data)) {
          return res.status(400).json({ error: "Imagem inválida" });
        }
        await redis.set(key, data);
        return res.status(200).json({ ok: true });
      }
      if (req.method === "DELETE") {
        await redis.del(key);
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
