import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { Readable, Transform } from 'node:stream';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export interface SafeFetchOptions {
  // Only trusted internal callers/tests may change this; never derive it from an HTTP payload.
  allowPrivateTargets?: boolean;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    // Permit global unicast only; mapped IPv4, link-local, unique-local and multicast are excluded.
    const first = parseInt(normalized.split(':')[0] || '0', 16);
    if (first < 0x2000 || first > 0x3fff || first === 0x2002) return false;
    const second = parseInt(normalized.split(':')[1] || '0', 16);
    if (first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) return false;
    if (first === 0x3fff && second <= 0x0fff) return false;
    return true;
  }
  return false;
}

function isLocalSimulator(url: URL): boolean {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(hostname) &&
    port === String(process.env.PORT || 3335) && /^\/api\/v1\/chaos\/(echo|simulate-delay|simulate-error|simulate-flaky)\/?$/.test(url.pathname);
}

export async function resolveTarget(url: URL, options: SafeFetchOptions = {}): Promise<{ address: string; family: 4 | 6 | 0 }> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Destino HTTP(S) inválido ou com credenciais na URL.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  const localSimulator = isLocalSimulator(url);
  const allowPrivate = options.allowPrivateTargets ?? process.env.NODE_ENV === 'test';
  const allowlist = (process.env.TARGET_ALLOWED_HOSTS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!localSimulator && allowlist.length && !allowlist.includes(hostname)) throw new Error('O destino não está permitido na política de saída desta instalação.');
  if (!localSimulator && !allowPrivate && (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local'))) throw new Error('Destinos de rede privada não são permitidos.');
  const literalFamily = isIP(hostname);
  let addresses: {address:string;family:number}[];
  try { addresses = literalFamily ? [{ address: hostname, family: literalFamily }] : await lookup(hostname, { all: true, verbatim: true }); }
  catch (error) {
    // A configured egress proxy may own DNS. Delegate only operator-approved hostnames, never arbitrary user input.
    if (!localSimulator && proxyFor(url) && allowlist.includes(hostname)) return {address:hostname,family:0};
    throw new Error('Não foi possível resolver o destino com segurança. Para DNS via proxy, configure TARGET_ALLOWED_HOSTS com o hostname autorizado.');
  }
  if (!addresses.length || (!localSimulator && !allowPrivate && addresses.some(item => !isPublicAddress(item.address)))) throw new Error('Destinos de rede privada, reservada ou de metadados não são permitidos.');
  if (localSimulator && addresses.some(item => !['127.0.0.1', '::1'].includes(item.address))) throw new Error('O simulador local deve resolver para loopback.');
  const selected = addresses.find(item => item.family === 4) || addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function proxyFor(url: URL): string | undefined {
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(hostname)) return undefined;
  const entries = (process.env.NO_PROXY || process.env.no_proxy || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (entries.some(entry => entry === '*' || hostname === entry || (entry.startsWith('.') && hostname.endsWith(entry)))) return undefined;
  return url.protocol === 'https:' ? process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy : process.env.HTTP_PROXY || process.env.http_proxy;
}

async function withSignal<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) { void promise.catch(() => undefined); throw signal.reason || new DOMException('Aborted', 'AbortError'); }
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, {once:true});
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function responseStream(source: Readable, dispose: () => void): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await iterator.next();
        if (cancelled) return;
        if (chunk.done) controller.close();
        else controller.enqueue(new Uint8Array(chunk.value));
      } catch (error) { if (!cancelled) controller.error(error); }
    },
    cancel() {
      cancelled = true;
      source.destroy();
      dispose();
      void iterator.return?.().catch(() => undefined);
    }
  });
}

async function requestOnce(url: URL, init: RequestInit, options: SafeFetchOptions): Promise<Response> {
  const target = await withSignal(resolveTarget(url, options), init.signal);
  if (init.signal?.aborted) throw init.signal.reason || new DOMException('Aborted', 'AbortError');
  const headers = new Headers(init.headers);
  for (const name of ['host', 'connection', 'proxy-authorization', 'transfer-encoding', 'content-length', 'upgrade']) headers.delete(name);
  headers.set('accept-encoding', 'identity');
  const body = init.body;
  if (body !== undefined && body !== null && typeof body !== 'string') throw new Error('O body deve ser texto JSON.');
  return new Promise<Response>((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const proxy = proxyFor(url);
    const proxyAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;
    const requestHeaders: Record<string,string> = {};
    headers.forEach((value,key) => { requestHeaders[key] = value; });
    requestHeaders.host = url.host;
    const request = transport.request({
      protocol: url.protocol, hostname: proxyAgent ? target.address : url.hostname.replace(/^\[|\]$/g,''),
      servername: isIP(url.hostname.replace(/^\[|\]$/g,'')) ? undefined : url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, agent: proxyAgent,
      method: init.method || 'GET', headers: requestHeaders, signal: init.signal || undefined,
      // Pin the validated address while retaining the original Host and TLS server name.
      lookup: ((_host: string, lookupOptions: { all?: boolean }, callback: (...args: unknown[]) => void) => {
        if (lookupOptions?.all) callback(null, [target]);
        else callback(null, target.address, target.family);
      }) as http.RequestOptions['lookup']
    }, raw => {
      const responseHeaders = new Headers();
      for (let i = 0; i < raw.rawHeaders.length; i += 2) responseHeaders.append(raw.rawHeaders[i], raw.rawHeaders[i + 1]);
      const status = raw.statusCode || 502;
      if (status < 200 || status > 599) { raw.destroy(); reject(new Error('Resposta HTTP não suportada.')); return; }
      const noBody = init.method?.toUpperCase() === 'HEAD' || [204, 205, 304].includes(status);
      let bytes = 0;
      const limited = new Transform({ transform(chunk: Buffer, _encoding, done) {
        bytes += chunk.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) done(new Error('A resposta excedeu o limite de 2 MiB.'));
        else done(null, chunk);
      } });
      raw.on('error', error => limited.destroy(error));
      limited.on('error', () => { raw.destroy(); request.destroy(); });
      const encoding = String(raw.headers['content-encoding'] || '').toLowerCase();
      const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : null;
      if (decoder) decoder.on('error', error => limited.destroy(error));
      const source = noBody ? null : decoder ? raw.pipe(decoder).pipe(limited) : raw.pipe(limited);
      const response = new Response(source ? responseStream(source, () => { decoder?.destroy(); raw.destroy(); request.destroy(); }) : null, { status, statusText: raw.statusMessage, headers: responseHeaders });
      Object.defineProperty(response, 'url', { value: url.href });
      if (noBody) raw.resume();
      resolve(response);
    });
    request.on('error', error => { proxyAgent?.destroy(); reject(error); });
    request.on('close', () => { proxyAgent?.destroy(); });
    if (body) request.write(body);
    request.end();
  });
}

/** HTTP client with address pinning, checked redirects, body limits and AbortSignal support. */
export async function safeFetch(input: string | URL, init: RequestInit = {}, options: SafeFetchOptions = {}): Promise<Response> {
  let url = new URL(input);
  let current = { ...init, headers: new Headers(init.headers) };
  for (let redirects = 0; ; redirects++) {
    const response = await requestOnce(url, current, options);
    const location = response.headers.get('location');
    if (!REDIRECTS.has(response.status) || !location) return response;
    await response.body?.cancel();
    if (redirects >= MAX_REDIRECTS) throw new Error('O destino excedeu o limite de redirecionamentos.');
    const next = new URL(location, url);
    const headers = new Headers(current.headers);
    const crossOrigin = next.origin !== url.origin;
    if (crossOrigin) {
      const safeHeaders = new Set(['accept','accept-language','content-type']);
      const names: string[] = [];
      headers.forEach((_value,name)=>names.push(name));
      for (const name of names) if (!safeHeaders.has(name)) headers.delete(name);
    }
    const method = (current.method || 'GET').toUpperCase();
    if ((response.status === 303 && method !== 'GET' && method !== 'HEAD') || ((response.status === 301 || response.status === 302) && method === 'POST')) {
      current = { ...current, method: 'GET', body: undefined, headers };
      headers.delete('content-type');
    } else {
      if (crossOrigin && current.body != null) throw new Error('Redirecionamento com body para outra origem bloqueado. Configure o destino final explicitamente.');
      current = { ...current, headers };
    }
    url = next;
  }
}
