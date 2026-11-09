/* Fotos de exercícios e receitas: redimensiona no navegador e envia para /api/foto/<id>. */
import { api } from './api.js';

export const photoUrl = (id) => `/api/foto/${id}`;

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
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco no JPEG
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL('image/jpeg', quality);
        if (out.length <= 150000) return resolve(out);
        size *= 0.8;
        quality -= 0.08;
      }
      reject(new Error('Imagem grande demais.'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui ler essa imagem.')); };
    img.src = url;
  });
}

export const uploadPhoto = (id, data) => api('PUT', photoUrl(id), { data }).catch(() => { throw new Error('Não consegui enviar a foto.'); });
export const deletePhoto = (id) => fetch(photoUrl(id), { method: 'DELETE' }).catch(() => {});

/* Fotos anexadas à refeição (análise por IA) */
export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem. Tente outra foto.')); };
    img.src = url;
  });
}
export function scaleImage(img, max, q) {
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * r));
  c.height = Math.max(1, Math.round(img.height * r));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
