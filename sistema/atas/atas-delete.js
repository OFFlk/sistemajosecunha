/**
 * functions/api/atas-delete.js
 * DELETE /api/atas-delete
 * Body: { fileId, resourceType }
 * Retorna: { success: true, folderRemoved }
 *
 * Depois de apagar o arquivo, checa se sobrou mais alguma coisa na mesma
 * pasta — o `fileId` já vem com o prefixo da pasta (ex.:
 * "atas/1994_SEM-TURNO_1_SERIE/nome_1699999999"), então a pasta é derivada
 * direto dele, sem precisar do turmaId. Se não sobrou nada, apaga a pasta
 * também — evita pasta vazia órfã no Cloudinary quando o último scan de
 * uma turma é removido pelo botão individual (mesmo padrão de limpeza já
 * resolvido no módulo de ano-ativo; complementa atas-delete-turma.js, que
 * cobre o caso de apagar a turma inteira).
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

async function cloudinaryDestroy(env, fileId, type) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sigStr = `public_id=${fileId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const signature = await sha256Hex(sigStr);
  const body = JSON.stringify({
    public_id: fileId,
    timestamp,
    api_key: env.CLOUDINARY_API_KEY,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${type}/destroy`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
  );
  return res.json();
}

/** Chamada Admin API com Basic Auth — mesmo padrão de atas-list.js /
 *  atas-delete-turma.js (usado aqui só pra checar/limpar a pasta). */
async function cloudinaryAdminRequest(env, path, method = 'GET') {
  const auth = btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`);
  const res = await fetch(`https://api.cloudinary.com${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.json();
}

/** Deriva a pasta a partir do public_id (tudo antes da última barra).
 *  Ex.: "atas/1994_SEM-TURNO_1_SERIE/nome_123" → "atas/1994_SEM-TURNO_1_SERIE" */
function pastaDoFileId(fileId) {
  const i = fileId.lastIndexOf('/');
  return i === -1 ? '' : fileId.slice(0, i);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestDelete({ request, env }) {
  const headers = corsHeaders();

  try {
    const { fileId, resourceType } = await request.json();
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Campo obrigatório: fileId' }), { status: 400, headers });
    }

    // Tudo é imagem (PDFs convertidos no cliente antes do upload)
    await cloudinaryDestroy(env, fileId, 'image');

    // Se não sobrou mais nada na pasta, apaga a pasta também. Best-effort:
    // qualquer falha aqui não desfaz a exclusão do arquivo, que já aconteceu.
    let folderRemoved = false;
    const folder = pastaDoFileId(fileId);
    if (folder) {
      try {
        const checkPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload?prefix=${encodeURIComponent(folder)}&max_results=1&type=upload`;
        const check = await cloudinaryAdminRequest(env, checkPath, 'GET');
        const sobrouAlgo = Array.isArray(check.resources) && check.resources.length > 0;

        if (!sobrouAlgo) {
          const folderPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/folders/${folder}`;
          const folderResult = await cloudinaryAdminRequest(env, folderPath, 'DELETE');
          folderRemoved = !folderResult.error;
        }
      } catch (e) {
        console.warn('[atas-delete] falha ao checar/limpar pasta vazia:', e.message);
      }
    }

    return new Response(JSON.stringify({ success: true, folderRemoved }), { status: 200, headers });

  } catch (err) {
    console.error('[atas-delete]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
