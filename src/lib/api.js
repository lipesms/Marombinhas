/* Cliente HTTP único: devolve JSON ou lança Error com mensagem em português (e .status). */
export async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Sem conexão. Confira a internet e tente de novo.');
  }
  let data = null;
  try { data = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) {
    const fallback = r.status === 413 ? 'As fotos ficaram grandes demais. Envie menos fotos ou fotos menores.' : `Algo deu errado (erro ${r.status}). Tente de novo.`;
    throw Object.assign(new Error((data && data.error) || fallback), { status: r.status });
  }
  return data;
}
