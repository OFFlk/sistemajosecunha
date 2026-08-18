/**
 * functions/api/users-delete.js
 * POST /api/users-delete
 * Headers: Authorization: Bearer <ID token do Firebase Auth do chamador>
 * Body: { uid: "<uid do usuário a ser excluído>" }
 * Retorna: { success: true }
 *
 * Faz o que Auth.deleteUser(uid) deveria sempre ter feito:
 *  1. Confirma que quem está chamando é um usuário autenticado (verifica o
 *     ID token contra as chaves públicas do Google).
 *  2. Confirma que quem está chamando tem role 'admin' no Firestore.
 *  3. Apaga a conta no Firebase Authentication (Identity Toolkit REST API).
 *  4. Apaga o doc users/{uid} no Firestore.
 * Tudo via REST + Web Crypto — sem firebase-admin (não roda no runtime do
 * Cloudflare Pages) e sem precisar de Cloud Functions/plano Blaze.
 */

const PROJECT_ID = 'sistema-jose-cunha';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

/* ─── Base64url helpers ─── */
function b64urlEncode(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function b64urlDecodeToJson(str) {
  return JSON.parse(new TextDecoder().decode(b64urlDecodeToBytes(str)));
}

/* ─── Importa a chave privada da service account (PEM PKCS8) pra assinar ─── */
async function importPrivateKey(pem) {
  const clean = pem
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/* ─── Gera um access token OAuth2 assinando um JWT com a service account ─── */
async function getServiceAccountAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encHeader = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encClaims = b64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const signInput = `${encHeader}.${encClaims}`;

  const key = await importPrivateKey(env.FIREBASE_PRIVATE_KEY);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signInput));
  const jwt = `${signInput}.${b64urlEncode(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Falha ao autenticar service account: ' + JSON.stringify(data));
  return data.access_token;
}

/* ─── Verifica o ID token do Firebase Auth de quem está chamando ─── */
async function verifyIdToken(idToken) {
  const [encHeader, encClaims, encSig] = idToken.split('.');
  if (!encHeader || !encClaims || !encSig) throw new Error('Token inválido.');

  const header = b64urlDecodeToJson(encHeader);
  const claims = b64urlDecodeToJson(encClaims);

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) throw new Error('Token expirado.');
  if (claims.aud !== PROJECT_ID) throw new Error('Token de projeto errado.');
  if (claims.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error('Issuer inválido.');

  // Busca a chave pública correspondente ao kid do header
  const jwksRes = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/[email protected]'
  );
  const jwks = await jwksRes.json();
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Chave pública não encontrada para verificar o token.');

  const pubKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    pubKey,
    b64urlDecodeToBytes(encSig),
    new TextEncoder().encode(`${encHeader}.${encClaims}`)
  );
  if (!valid) throw new Error('Assinatura do token inválida.');

  return claims; // claims.sub = uid do chamador
}

/* ─── Firestore REST: lê um doc ─── */
async function firestoreGetDoc(accessToken, path) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Falha ao ler documento no Firestore.');
  const data = await res.json();
  const fields = data.fields || {};
  const out = {};
  for (const k in fields) {
    const v = fields[k];
    out[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.doubleValue ?? null;
  }
  return out;
}

/* ─── Firestore REST: apaga um doc ─── */
async function firestoreDeleteDoc(accessToken, path) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // 404 é ok — já não existia (caso de conta fantasma sem doc)
  if (!res.ok && res.status !== 404) throw new Error('Falha ao apagar documento no Firestore.');
}

/* ─── Identity Toolkit REST: apaga a conta no Firebase Auth ─── */
async function deleteAuthAccount(accessToken, uid) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ localId: uid }),
    }
  );
  const data = await res.json().catch(() => ({}));
  // USER_NOT_FOUND é ok — já não existia no Auth (não deveria acontecer, mas não é erro fatal aqui)
  const isNotFound = data.error?.message === 'USER_NOT_FOUND';
  if (!res.ok && !isNotFound) {
    throw new Error('Falha ao apagar conta no Firebase Auth: ' + JSON.stringify(data));
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders();

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers });
    }

    const { uid } = await request.json();
    if (!uid) {
      return new Response(JSON.stringify({ error: 'Campo obrigatório: uid' }), { status: 400, headers });
    }

    // 1. Confirma quem está chamando
    const callerClaims = await verifyIdToken(idToken);
    const callerUid = callerClaims.sub;

    // 2. Pega o access token da service account (usado tanto pra checar
    //    permissão quanto pra fazer as exclusões)
    const accessToken = await getServiceAccountAccessToken(env);

    // 3. Confirma que quem está chamando é admin
    const callerDoc = await firestoreGetDoc(accessToken, `users/${callerUid}`);
    if (!callerDoc || callerDoc.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem excluir usuários.' }), {
        status: 403,
        headers,
      });
    }

    // 4. Apaga dos dois lugares
    await deleteAuthAccount(accessToken, uid);
    await firestoreDeleteDoc(accessToken, `users/${uid}`);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('[users-delete]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
