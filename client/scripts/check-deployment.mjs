import axios from 'axios';

// Public, read-only probes. No login, account creation or cookie values in output.
const checks = [
  { name: 'Render: health', url: 'https://spectr-testops-server.onrender.com/health', status: 200, valid: data => data?.service === 'Spectr TestOps Engine' },
  { name: 'Render: sessão sem login', url: 'https://spectr-testops-server.onrender.com/api/v1/auth/me', status: 401, valid: data => typeof data?.message === 'string' },
  { name: 'Vercel: sessão encaminhada', url: 'https://spectr-testops.vercel.app/api/v1/auth/me', status: 401, valid: data => typeof data?.message === 'string' }
];

const results = await Promise.all(checks.map(async check => {
  try {
    const response = await axios.get(check.url, { timeout: 30_000, maxRedirects: 0, validateStatus: () => true, headers: { Accept: 'application/json' } });
    const json = /^application\/json(?:;|$)/i.test(response.headers['content-type'] || '');
    const passed = response.status === check.status && json && check.valid(response.data);
    return { passed, line: `${passed ? 'PASS' : 'FAIL'} ${check.name}: HTTP ${response.status}, ${json ? 'JSON' : 'resposta não JSON'} (esperado ${check.status} JSON)` };
  } catch {
    return { passed: false, line: `FAIL ${check.name}: sem resposta acessível; confira disponibilidade e acesso de rede.` };
  }
}));
for (const result of results) console.log(result.line);
if (results.some(result => !result.passed)) process.exitCode = 1;
