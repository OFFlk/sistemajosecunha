/**
 * functions/api/avatar-upload.js
 * POST /api/avatar-upload
 * Body: { tipo, entidadeId, fileBase64, mimeType }
 *   tipo: 'aluno' (por enquanto — 'funcionario' entra quando esse módulo existir)
 *   entidadeId: alunoId hoje; futuramente também funcionarioId
 * Retorna: { fotoUrl, fotoFileId }
 *
 * Diferente de drive-upload.js (documentos soltos, nome único por envio):
 * usa um public_id FIXO por entidade (sem timestamp) + overwrite:true —
 * reenviar uma foto nova substitui a antiga automaticamente no Cloudinary,
 * sem acumular versões velhas do avatar. Fica numa pasta própria
 * (avatares/...), separada da pasta de documentos — o avatar nunca aparece
 * na listagem de documentos (/api/drive-list), então não precisa de nenhum
 * filtro por nome do lado do frontend.
 */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pasta por tipo de entidade — pronto pra quando o módulo de funcionários
// chegar, basta o frontend passar tipo:'funcionario'.
const PASTAS_POR_TIPO = {
  aluno: 'avatares/alunos',
  funcionario: 'avatares/funcionarios',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders();

  try {
    const { tipo, entidadeId, fileBase64, mimeType } = await request.json();

    if (!tipo || !entidadeId || !fileBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: tipo, entidadeId, fileBase64, mimeType' }),
        { status: 400, headers }
      );
    }

    const pasta = PASTAS_POR_TIPO[tipo];
    if (!pasta) {
      return new Response(
        JSON.stringify({ error: `tipo inválido: "${tipo}". Use um de: ${Object.keys(PASTAS_POR_TIPO).join(', ')}` }),
        { status: 400, headers }
      );
    }

    // public_id FIXO (sem timestamp/nome de arquivo) — é isso que garante
    // que reenviar uma foto substitui a anterior em vez de criar outra.
    const publicId = `${pasta}/${entidadeId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const allParams = { overwrite: true, public_id: publicId, timestamp };
    const sigStr = Object.keys(allParams)
      .sort()
      .map(k => `${k}=${allParams[k]}`)
      .join('&') + env.CLOUDINARY_API_SECRET;
    const signature = await sha256Hex(sigStr);

    const dataUri = `data:${mimeType};base64,${fileBase64}`;
    const body = JSON.stringify({
      file: dataUri,
      public_id: publicId,
      overwrite: true,
      timestamp,
      api_key: env.CLOUDINARY_API_KEY,
      signature,
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);

    return new Response(JSON.stringify({
      fotoUrl: result.secure_url,
      fotoFileId: result.public_id,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[avatar-upload]', err.message || err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
