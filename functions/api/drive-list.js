/**
 * functions/api/drive-list.js — Cloudinary via Admin API (resources by folder)
 * GET /api/drive-list?alunoId=xxx
 */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
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
    const alunoId = url.searchParams.get('alunoId');
    if (!alunoId) {
      return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: alunoId' }), { status: 400, headers });
    }

    const folder = `alunos/${alunoId}`;
    const files = [];

    // Busca imagens
    const imgPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload?prefix=${encodeURIComponent(folder)}&max_results=50&type=upload`;
    const imgRes = await cloudinaryRequest(env, imgPath);
    (imgRes.resources || []).forEach(r => {
      files.push({
        fileId: r.public_id,
        fileName: r.public_id.split('/').pop(),
        mimeType: `image/${r.format}`,
        webViewLink: r.secure_url,
        createdAt: r.created_at,
        label: r.context?.custom?.label || r.public_id.split('/').pop(),
      });
    });

    // Busca raw (PDFs, docs)
    const rawPath = `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/raw/upload?prefix=${encodeURIComponent(folder)}&max_results=50&type=upload`;
    const rawRes = await cloudinaryRequest(env, rawPath);
    (rawRes.resources || []).forEach(r => {
      const ext = r.public_id.split('.').pop()?.toLowerCase();
      const mime = ext === 'pdf' ? 'application/pdf'
        : (ext === 'doc' || ext === 'docx') ? 'application/msword'
        : 'application/octet-stream';
      files.push({
        fileId: r.public_id,
        fileName: r.public_id.split('/').pop(),
        mimeType: mime,
        webViewLink: r.secure_url,
        createdAt: r.created_at,
        label: r.context?.custom?.label || r.public_id.split('/').pop(),
      });
    });

    // Ordena por data desc
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(JSON.stringify({ files }), { status: 200, headers });

  } catch (err) {
    console.error('[cloudinary-list]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
