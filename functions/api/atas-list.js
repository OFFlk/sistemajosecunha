/**
 * functions/api/atas-list.js — Lista scans do livro de atas por turma
 * GET /api/atas-list?turmaId=xxx
 *
 * Pasta no Cloudinary: atas/{turmaId_slug}
 */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

/** Sanitiza o ID da turma para uso como nome de pasta no Cloudinary.
 *  Ex: "1994|SEM-TURNO|1º SERIE|1º 1994" → "1994_SEM-TURNO_1_SERIE_1_1994"
 */
function slugTurma(turmaId) {
  return String(turmaId)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function cloudinaryRequest(env, path) {
  const auth = btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`);
  const res = await fetch(`https://api.cloudinary.com${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.json();
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet({ request, env }) {
  const headers = corsHeaders();

  try {
    const url = new URL(request.url);
    const turmaId = url.searchParams.get('turmaId');
    if (!turmaId) {
      return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: turmaId' }), { status: 400, headers });
    }

    const folder = `atas/${slugTurma(turmaId)}`;
    const files = [];

    // Busca imagens (jpg, png, etc.)
    const imgPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload?prefix=${encodeURIComponent(folder)}&max_results=50&type=upload`;
    const imgRes = await cloudinaryRequest(env, imgPath);
    (imgRes.resources || []).forEach(r => {
      files.push({
        fileId:      r.public_id,
        fileName:    r.public_id.split('/').pop(),
        mimeType:    `image/${r.format}`,
        resourceType: 'image',
        webViewLink: r.secure_url,
        createdAt:   r.created_at,
      });
    });

    // Tudo é imagem (PDFs convertidos no cliente antes do upload)
    // Ordena por data desc (mais recente primeiro)
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(JSON.stringify({ files }), { status: 200, headers });

  } catch (err) {
    console.error('[atas-list]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
