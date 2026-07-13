/**
 * functions/api/atas-upload.js
 * POST /api/atas-upload
 * Body: { turmaId, fileName, mimeType, fileBase64 }
 * Retorna: { fileId, fileName, mimeType, resourceType, webViewLink, createdAt }
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

function getExt(fileName) {
  const m = fileName.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : '';
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

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cloudinaryUpload(env, fileBase64, mimeType, publicId, folder, resourceType) {
  const timestamp = Math.floor(Date.now() / 1000);

  const extraParams = resourceType === 'raw'
    ? { use_filename: true, unique_filename: false }
    : {};

  const allParams = { folder, public_id: publicId, timestamp, ...extraParams };
  const sigStr = Object.keys(allParams)
    .sort()
    .map(k => `${k}=${allParams[k]}`)
    .join('&') + env.CLOUDINARY_API_SECRET;
  const signature = await sha256Hex(sigStr);

  const dataUri = `data:${mimeType};base64,${fileBase64}`;

  const body = JSON.stringify({
    file: dataUri,
    public_id: publicId,
    folder,
    timestamp,
    api_key: env.CLOUDINARY_API_KEY,
    signature,
    resource_type: resourceType,
    ...extraParams,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
  );

  const parsed = await res.json();
  if (parsed.error) throw new Error(parsed.error.message);
  return parsed;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders();

  try {
    const { turmaId, fileName, mimeType, fileBase64 } = await request.json();

    if (!turmaId || !fileName || !mimeType || !fileBase64) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: turmaId, fileName, mimeType, fileBase64' }),
        { status: 400, headers }
      );
    }

    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const ext = getExt(fileName);
    const folder = `atas/${slugTurma(turmaId)}`;

    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = baseName + '_' + Date.now();
    const publicId = resourceType === 'raw' && ext ? `${uniqueId}.${ext}` : uniqueId;

    const result = await cloudinaryUpload(env, fileBase64, mimeType, publicId, folder, resourceType);

    return new Response(JSON.stringify({
      fileId:      result.public_id,
      fileName,
      mimeType,
      resourceType,
      webViewLink: result.secure_url,
      createdAt:   result.created_at || new Date().toISOString(),
    }), { status: 200, headers });

  } catch (err) {
    console.error('[atas-upload]', err.message || err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
