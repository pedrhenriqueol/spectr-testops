import { expect, test, type Page, type Route } from '@playwright/test';

const fixture = {
  user: { id: '11111111-1111-4111-8111-111111111111', name: 'Session QA', email: 'session@example.invalid' },
  workspaces: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Session Workspace', slug: 'session-qa', role: 'OWNER' }],
  currentWorkspaceId: '22222222-2222-4222-8222-222222222222'
};
const credentials = { email: fixture.user.email, password: 'Browser-fixture-only-123' };
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const switcher = (page: Page) => page.getByRole('button', { name: 'Selecionar workspace: Session Workspace', exact: true });

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

async function signIn(page: Page) {
  await page.getByLabel('E-mail', { exact: true }).fill(credentials.email);
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password);
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('rejected registration cookie never opens the workspace and can retry as login', async ({ page }) => {
  let accepted = false;
  let registerPosts = 0;
  let workspaceRequests = 0;
  const requests: string[] = [];
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path.endsWith('/auth/me')) return json(route, accepted ? 200 : 401, accepted ? fixture : { message: 'No session' });
    if (path.endsWith('/auth/register')) { registerPosts++; return json(route, 201, fixture); }
    if (path.endsWith('/auth/login')) return json(route, 200, fixture);
    workspaceRequests++;
    return json(route, 200, path.endsWith('/suites') ? { suites: [] } : { runs: [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByLabel('Seu nome', { exact: true }).fill('Session QA');
  await page.getByLabel('E-mail', { exact: true }).fill(credentials.email);
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Criar conta e workspace', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sua conta foi criada; não é necessário cadastrar novamente.');
  await expect(page.getByRole('heading', { name: 'Entre no Spectr' })).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(credentials.email);
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  expect(registerPosts).toBe(1);
  expect(workspaceRequests).toBe(0);
  accepted = true;
  requests.length = 0;
  await signIn(page);
  await expect(switcher(page)).toBeVisible();
  await expect.poll(() => requests.includes('/api/v1/suites')).toBe(true);
  expect(requests.indexOf('/api/v1/auth/me')).toBeLessThan(requests.indexOf('/api/v1/suites'));
  await page.reload();
  await expect(switcher(page)).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});

test('successful login with a rejected cookie stays on sign-in with an actionable error', async ({ page }) => {
  let workspaceRequests = 0;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return json(route, 401, { message: 'No session' });
    if (path.endsWith('/auth/login')) return json(route, 200, fixture);
    workspaceRequests++;
    return json(route, 200, {});
  });
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Não foi possível manter sua sessão.');
  await expect(page.getByRole('heading', { name: 'Entre no Spectr' })).toBeVisible();
  await expect(switcher(page)).toHaveCount(0);
  expect(workspaceRequests).toBe(0);
});

test('a stale cookie belonging to another account cannot establish the new account session', async ({ page }) => {
  let authenticating = false;
  let workspaceRequests = 0;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return json(route, authenticating ? 200 : 401, authenticating ? { ...fixture, user: { ...fixture.user, id: '33333333-3333-4333-8333-333333333333' } } : {});
    if (path.endsWith('/auth/login')) { authenticating = true; return json(route, 200, fixture); }
    workspaceRequests++;
    return json(route, 200, {});
  });
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('alert')).toContainText('Não foi possível manter sua sessão.');
  expect(workspaceRequests).toBe(0);
});

test('a slow session confirmation keeps the form busy instead of flashing workspace content', async ({ page }) => {
  let loginPosted = false;
  let pending: Route | undefined;
  let workspaceRequests = 0;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) {
      if (loginPosted) { pending = route; return; }
      return json(route, 401, {});
    }
    if (path.endsWith('/auth/login')) { loginPosted = true; return json(route, 200, fixture); }
    workspaceRequests++;
    return json(route, 200, path.endsWith('/suites') ? { suites: [] } : { runs: [] });
  });
  await page.goto('/');
  await signIn(page);
  await expect.poll(() => Boolean(pending)).toBe(true);
  await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('form button[type="submit"]')).toBeDisabled();
  expect(workspaceRequests).toBe(0);
  await json(pending!, 200, fixture);
  await expect(switcher(page)).toBeVisible();
});

test('a late protected 401 from the previous session does not log out a new login', async ({ page }) => {
  let authenticated = true;
  let pending: Route | undefined;
  let suiteLoads = 0;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return json(route, authenticated ? 200 : 401, authenticated ? fixture : {});
    if (path.endsWith('/auth/logout')) { authenticated = false; return route.fulfill({ status: 204 }); }
    if (path.endsWith('/auth/login')) { authenticated = true; return json(route, 200, fixture); }
    if (path.endsWith('/suites')) {
      suiteLoads++;
      if (suiteLoads === 1) { pending = route; return; }
      return json(route, 200, { suites: [] });
    }
    return json(route, 200, { runs: [] });
  });
  await page.goto('/');
  await expect(switcher(page)).toBeVisible();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await switcher(page).click();
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre no Spectr' })).toBeVisible();
  await signIn(page);
  await expect(switcher(page)).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.url().endsWith('/suites') && response.status() === 401);
  await json(pending!, 401, { message: 'Old session expired' });
  await oldResponse;
  // Waiting for an actual UI action also lets the rejected Axios promise settle.
  await switcher(page).click();
  await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
});

test('an expired current session returns once to login and explains the reason', async ({ page }) => {
  let pending: Route | undefined;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return json(route, 200, fixture);
    if (path.endsWith('/suites')) { pending = route; return; }
    return json(route, 200, { runs: [] });
  });
  await page.goto('/');
  await expect(switcher(page)).toBeVisible();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await json(pending!, 401, { message: 'Session expired' });
  await expect(page.getByRole('heading', { name: 'Entre no Spectr' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Sua sessão expirou ou foi encerrada.');
  await expect(switcher(page)).toHaveCount(0);
});
