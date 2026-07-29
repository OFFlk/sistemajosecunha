/**
 * functions/api/avatar-upload.js
 * POST /api/avatar-upload
 *
 * Body (upload direto — arquivo escolhido pelo usuário):
 *   { tipo, entidadeId, ano, fileBase64, mimeType }
 *
 * Body (copiar de uma foto já existente no Cloudinary):
 *   { tipo, entidadeId, ano, sourceUrl }
 *
 *   tipo: 'aluno' (por enquanto — 'funcionario' entra quando esse módulo existir)
 *   entidadeId: alunoId hoje; futuramente também funcionarioId
 *   ano: ano letivo da matrícula. OBRIGATÓRIO para tipo:'aluno' — a foto do
 *        aluno agora é versionada por matrícula/ano, não mais global pro
 *        aluno inteiro (ver TIPOS_COM_ANO abaixo).
 *
 * Retorna: { fotoUrl, fotoFileId }
 *
 * public_id é FIXO por entidade(+ano) — sem timestamp — e overwrite:true:
 * reenviar uma foto nova pro mesmo aluno+ano substitui a antiga
 * automaticamente no Cloudinary, sem acumular versões velhas do avatar.
 *
 * invalidate:true é essencial: sem isso, o CDN do Cloudinary continua
 * servindo a versão antiga da imagem em cache mesmo depois do overwrite
 * ter substituído o arquivo de verdade, já que o public_id (e portanto a
 * URL de entrega) não muda entre uploads.
 *
 * asset_folder é enviado à parte pra contas em "Dynamic Folder Mode" (padrão
 * em contas Cloudinary criadas a partir de meados de 2024): nesse modo, as
 * barras do public_id NÃO definem sozinhas a pasta exibida no Media Library
 * — é preciso mandar esse parâmetro explicitamente, senão o Cloudinary joga
 * o asset solto na raiz mesmo com um public_id "avatares/alunos/ALU-000874/2026".
 * Isso é só organização visual no painel, não afeta a URL de entrega.
 *
 * MODO "copiar de URL" (sourceUrl): usado pela sugestão de foto na
 * rematrícula — copia a foto de uma matrícula anterior do mesmo aluno pro
 * public_id do ano novo, sem o arquivo passar de novo pelo navegador. O
 * Cloudinary busca a URL remota (deve ser uma URL já hospedada nele mesmo,
 * https://res.cloudinary.com/...) e cria uma cópia independente sob o novo
 * public_id — a foto original (ano antigo) continua intacta, já que isso é
 * uma cópia, não uma movimentação.
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

// Tipos cuja foto é versionada por ano letivo (public_id ganha /{ano} no
// final, ex.: avatares/alunos/ALU-000874/2026). Ajustar aqui se algum dia
// "funcionario" também precisar de histórico por ano — hoje não precisa,
// já que funcionário não tem "matrícula".
const TIPOS_COM_ANO = new Set(['aluno']);

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders();

  try {
    const { tipo, entidadeId, ano, fileBase64, mimeType, sourceUrl } = await request.json();

    if (!tipo || !entidadeId) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: tipo, entidadeId' }),
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

    const precisaAno = TIPOS_COM_ANO.has(tipo);
    if (precisaAno && !ano) {
      return new Response(
        JSON.stringify({ error: `Campo obrigatório pra tipo "${tipo}": ano` }),
        { status: 400, headers }
      );
    }

    // Upload direto (fileBase64) OU cópia de uma foto já existente (sourceUrl).
    // Exatamente um dos dois precisa vir preenchido.
    const file = sourceUrl || (fileBase64 && mimeType ? `data:${mimeType};base64,${fileBase64}` : null);
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Envie fileBase64+mimeType (upload direto) ou sourceUrl (copiar de foto existente)' }),
        { status: 400, headers }
      );
    }

    const publicId = precisaAno ? `${pasta}/${entidadeId}/${ano}` : `${pasta}/${entidadeId}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Todo parâmetro que vai no body (exceto file, api_key, signature e
    // cloud_name) precisa entrar aqui, em ordem alfabética das chaves, pra
    // assinatura bater com o que o Cloudinary espera.
    const allParams = {
      asset_folder: pasta,
      invalidate: true,
      overwrite: true,
      public_id: publicId,
      timestamp,
    };
    const sigStr = Object.keys(allParams)
      .sort()
      .map(k => `${k}=${allParams[k]}`)
      .join('&') + env.CLOUDINARY_API_SECRET;
    const signature = await sha256Hex(sigStr);

    const body = JSON.stringify({
      file,
      public_id: publicId,
      asset_folder: pasta,
      overwrite: true,
      invalidate: true,
      timestamp,
      api_key: env.CLOUDINARY_API_KEY,
      signature,
    });

    console.log(
      sourceUrl ? '[avatar-upload] copiando de URL existente:' : '[avatar-upload] enviando upload direto pro Cloudinary:',
      { publicId, pasta, ano: ano ?? null, timestamp, sourceUrl: sourceUrl || undefined }
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );
    const result = await res.json();

    if (result.error) {
      console.error('[avatar-upload] Cloudinary retornou erro:', result.error);
      throw new Error(result.error.message);
    }

    console.log('[avatar-upload] sucesso:', { public_id: result.public_id, version: result.version, url: result.secure_url });

    return new Response(JSON.stringify({
      fotoUrl: result.secure_url,
      fotoFileId: result.public_id,
    }), { status: 200, headers });

  } catch (err) {
    console.error('[avatar-upload] erro:', err.message || err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
