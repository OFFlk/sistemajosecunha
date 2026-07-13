/**
 * functions/api/drive-delete.js
 * DELETE /api/drive-delete
 * Body: { fileId, resourceType }
 * Retorna: { success: true }
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

    // Usa resourceType enviado ou tenta detectar pela extensão do fileId
    const ext = (fileId.split('.').pop() || '').toLowerCase();
    const type = resourceType || (
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ? 'image' : 'raw'
    );

    const result = await cloudinaryDestroy(env, fileId, type);

    // Se retornou "not found", tenta com o outro tipo
    if (result.result === 'not found') {
      const altType = type === 'image' ? 'raw' : 'image';
      await cloudinaryDestroy(env, fileId, altType);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('[cloudinary-delete]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
