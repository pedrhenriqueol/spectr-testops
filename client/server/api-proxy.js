import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade'
]);
const MAX_BODY_BYTES = 1024 * 1024;

function configuredTarget(env) {
  const value = env.SPECTR_API_URL || env.VITE_API_URL;
  if (!value) throw new Error('Missing API configuration');
  const target = new URL(value);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
    throw new Error('Invalid API configuration');
  }
  if (env.NODE_ENV === 'production' && target.protocol !== 'https:') throw new Error('HTTPS required');
  const pathname = target.pathname.replace(/\/+$/, '');
  if (!['', '/api', '/api/v1'].includes(pathname)) throw new Error('Invalid API base path');
  target.pathname = '/api/v1';
  return target;
}

function forwardedHeaders(headers, omitted = []) {
  const excluded = new Set([...HOP_HEADERS, ...omitted]);
  for (const value of String(headers.connection || '').split(',')) excluded.add(value.trim().toLowerCase());
  return Object.fromEntries(Object.entries(headers).filter(([name, value]) => value !== undefined && !excluded.has(name.toLowerCase())));
}

function failure(response, status = 502) {
  if (response.headersSent) { response.destroy(); return; }
  for (const name of response.getHeaderNames()) response.removeHeader(name);
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify({ message: status === 413 ? 'O corpo da requisição excede o limite permitido.' : 'Não foi possível conectar à API. Verifique a configuração do servidor e tente novamente.' }));
}

async function requestBody(request) {
  // Vercel can expose a parsed body; local Node requests are still readable streams.
  if (request.body !== undefined) {
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.from(typeof request.body === 'string' ? request.body : JSON.stringify(request.body));
    if (body.length > MAX_BODY_BYTES) throw Object.assign(new Error('Body too large'), { statusCode: 413 });
    return body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      request.resume();
      throw Object.assign(new Error('Body too large'), { statusCode: 413 });
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

/** Fixed upstream only: request paths and query strings never select another host. */
export function createApiProxy({ env = process.env, timeoutMs = 120_000 } = {}) {
  return async function proxy(request, response) {
    let target;
    try {
      target = configuredTarget(env);
      const incoming = new URL(request.url || '/', 'http://spectr.local');
      if (incoming.pathname !== '/api/v1' && !incoming.pathname.startsWith('/api/v1/')) throw new Error('Invalid API route');
      target.pathname += incoming.pathname.slice('/api/v1'.length);
      target.search = incoming.search;
    } catch { failure(response); return; }

    let body;
    try { body = await requestBody(request); }
    catch (error) { failure(response, error.statusCode === 413 ? 413 : 502); return; }
    if (response.destroyed) return;

    const headers = forwardedHeaders(request.headers, ['host', 'content-length', 'expect']);
    if (body.length) headers['content-length'] = String(body.length);
    const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
    // Keep the serverless invocation alive until its HTTP response finishes.
    await new Promise(resolve => {
      const done = () => {
        response.off('finish', done);
        response.off('close', done);
        resolve();
      };
      response.once('finish', done);
      response.once('close', done);
      let upstream;
      try {
        upstream = transport(target, { method: request.method, headers }, upstreamResponse => {
          response.statusCode = upstreamResponse.statusCode || 502;
          for (const [name, value] of Object.entries(forwardedHeaders(upstreamResponse.headers))) response.setHeader(name, value);
          // Node's native transport preserves Set-Cookie arrays and does not follow redirects.
          upstreamResponse.on('error', () => failure(response));
          upstreamResponse.pipe(response);
        });
      } catch { failure(response); return; }
      const timer = setTimeout(() => upstream.destroy(), timeoutMs);
      const abort = () => upstream.destroy();
      response.on('close', abort);
      upstream.on('error', () => failure(response));
      upstream.on('close', () => {
        clearTimeout(timer);
        response.off('close', abort);
      });
      upstream.end(body);
    });
  };
}
