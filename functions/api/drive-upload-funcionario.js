/**
 * functions/api/drive-upload-funcionario.js
 * POST /api/drive-upload-funcionario
 * Body: { funcionarioId, fileName, mimeType, fileBase64, label }
 * Retorna: { fileId, fileName, label, mimeType, resourceType, webViewLink, createdAt }
 *
 * Adaptado de drive-upload.js (módulo aluno). Mesma lógica, trocando
 * alunoId -> funcionarioId e a pasta de destino no Cloudinary:
 * alunos/{alunoId} -> funcionarios/{funcionarioId}
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

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function cloudinaryUpload(env, fileBase64, mimeType, publicId, folder, resourceType) {
  const timestamp = Math.floor(Date.now() / 1000);

  // Para raw: usa use_filename + unique_filename para preservar extensão
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
    const { funcionarioId, fileName, mimeType, fileBase64, label } = await request.json();

    if (!funcionarioId || !fileName || !mimeType || !fileBase64) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: funcionarioId, fileName, mimeType, fileBase64' }),
        { status: 400, headers }
      );
    }

    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const ext = getExt(fileName);
    const folder = `funcionarios/${funcionarioId}`;

    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = baseName + '_' + Date.now();
    const publicId = resourceType === 'raw' && ext ? `${uniqueId}.${ext}` : uniqueId;

    const result = await cloudinaryUpload(env, fileBase64, mimeType, publicId, folder, resourceType);

    return new Response(JSON.stringify({
      fileId: result.public_id,
      fileName,
      mimeType,
      resourceType,
      webViewLink: result.secure_url,
      createdAt: result.created_at || new Date().toISOString(),
      label: label || fileName,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[cloudinary-upload-funcionario]', err.message || err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
