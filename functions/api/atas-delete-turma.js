/**
 * functions/api/atas-delete-turma.js
 * DELETE /api/atas-delete-turma
 * Body: { turmaId }
 *
 * Apaga TODOS os scans da turma no Cloudinary (todo arquivo cujo public_id
 * comece com o prefixo da pasta atas/{turmaId_slug}) e, na sequência, a
 * própria pasta — pra não deixar nada órfão (arquivo nem pasta vazia).
 *
 * Complementa atas-delete.js (que continua existindo, pra apagar 1 scan por
 * vez dentro de cadastro-atas.html em modo edição). Esta rota é só pra
 * quando a TURMA INTEIRA é apagada (gestao-atas.html → apagarSelecionadas()).
 *
 * Retorna: { success: true, deletedCount, partial, folderRemoved }
 */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

/** Mesmo slug usado em atas-list.js / atas-upload.js — mantido idêntico de
 *  propósito. Se um dia isso virar util compartilhado entre os 4 arquivos,
 *  sincronizar todos juntos (hoje está duplicado nos 3 já existentes).
 *  Ex: "1994|SEM-TURNO|1º SERIE|1º 1994" → "1994_SEM-TURNO_1_SERIE_1_1994"
 */
function slugTurma(turmaId) {
  return String(turmaId)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Chamada Admin API com Basic Auth — mesmo padrão de atas-list.js,
 *  só que aceitando o método (list usa GET, aqui usamos DELETE). */
async function cloudinaryAdminRequest(env, path, method) {
  const auth = btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`);
  const res = await fetch(`https://api.cloudinary.com${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.json();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestDelete({ request, env }) {
  const headers = corsHeaders();

  try {
    const { turmaId } = await request.json();
    if (!turmaId) {
      return new Response(JSON.stringify({ error: 'Campo obrigatório: turmaId' }), { status: 400, headers });
    }

    const folder = `atas/${slugTurma(turmaId)}`;

    // 1) Apaga todos os arquivos (resource_type=image, único tipo usado neste
    //    módulo) cujo public_id comece com o prefixo da pasta.
    //    ATENÇÃO/limite conhecido: o endpoint por prefixo da Admin API cobre
    //    até 1000 recursos por chamada (retorna partial:true se sobrar mais —
    //    não tratado aqui; turma com >1000 scans é cenário não esperado hoje,
    //    mas fica registrado caso precise de paginação no futuro).
    const delPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload?prefix=${encodeURIComponent(folder)}`;
    const delResult = await cloudinaryAdminRequest(env, delPath, 'DELETE');
    if (delResult.error) throw new Error(delResult.error.message);

    const deletedCount = delResult.deleted ? Object.keys(delResult.deleted).length : 0;

    // 2) Apaga a pasta em si — só funciona vazia, por isso vem depois do
    //    passo 1. Se a turma nunca teve scan (pasta não existe), o Cloudinary
    //    responde com erro "not found" aqui: tratado como sucesso, não falha.
    const folderPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/folders/${folder}`;
    const folderResult = await cloudinaryAdminRequest(env, folderPath, 'DELETE');
    const folderRemoved = !folderResult.error;

    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      partial: !!delResult.partial,
      folderRemoved,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[atas-delete-turma]', err.message || err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
