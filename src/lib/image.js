// Reduz a foto no próprio navegador antes de enviar (celular tira foto de vários MB)
export function resizeImage(file, max = 480) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let size = max;
      let quality = 0.72;
      for (let i = 0; i < 5; i++) {
        const s = Math.min(1, size / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; // PNG transparente vira fundo branco no JPEG
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL("image/jpeg", quality);
        if (out.length <= 150000) return resolve(out);
        size *= 0.8;
        quality -= 0.08;
      }
      reject(new Error("Imagem grande demais"));
    };
    img.onerror = () => reject(new Error("Não consegui ler essa imagem"));
    img.src = url;
  });
}

export const photoUrl = (id) => `/api/foto?id=${id}`;

export async function uploadPhoto(id, dataUrl) {
  const r = await fetch(photoUrl(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: dataUrl }),
  });
  if (!r.ok) throw new Error("Não consegui enviar a foto");
}

export const deletePhoto = (id) => fetch(photoUrl(id), { method: "DELETE" }).catch(() => {});
