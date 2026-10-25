import { expect, test, type Page } from '@playwright/test';

const session = {
  user: { id: '11111111-1111-4111-8111-111111111111', name: 'Motion QA', email: 'motion@example.invalid' },
  workspaces: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Motion Workspace', slug: 'motion-qa', role: 'OWNER' }],
  currentWorkspaceId: '22222222-2222-4222-8222-222222222222'
};
const browserErrors = new WeakMap<Page, string[]>();

async function prepare(page: Page, authenticated = false) {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    localStorage.setItem('spectr_theme', 'dark');
    localStorage.setItem('spectr_language', 'pt');
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? session : { message: 'Faça login.' } });
    if (path.endsWith('/workspaces') && request.method() === 'POST') return route.fulfill({ status: 503, json: { message: 'Workspace temporarily unavailable' } });
    return route.fulfill({ json: path.endsWith('/suites') ? { suites: [] } : { runs: [] } });
  });
}

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test('exiting registration fields cannot block a quick sign-in', async ({ page }) => {
  await prepare(page);
  let loginAttempts = 0;
  await page.route('**/api/v1/auth/login', route => {
    loginAttempts += 1;
    return route.fulfill({ status: 400, json: { message: 'Motion sign-in reached the server' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.locator('#auth-name')).toBeFocused();
  await page.locator('#auth-email').fill('motion@example.invalid');
  await page.locator('#auth-workspace').fill('x'); // Invalid for registration, irrelevant for login.

  const exiting = await page.evaluate(async () => {
    const loginTab = [...document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(button => button.textContent === 'Entrar');
    loginTab!.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return ['auth-name', 'auth-workspace'].map(id => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      return !input || input.disabled || !input.willValidate;
    });
  });
  expect(exiting).toEqual([true, true]);
  await page.locator('#auth-password').fill('motion-only-password');
  await page.locator('#auth-password').press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Motion sign-in reached the server');
  expect(loginAttempts).toBe(1);
  await expect(page.locator('#auth-name')).toHaveCount(0);
  await expect(page.locator('#auth-workspace')).toHaveCount(0);

  await page.evaluate(async () => {
    for (let index = 0; index < 8; index += 1) {
      document.querySelector<HTMLButtonElement>('button[aria-pressed="false"]')!.click();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
  });
  await expect(page.getByRole('heading', { name: 'Entre no Spectr' })).toBeVisible();
  await expect(page.locator('#auth-name')).toHaveCount(0);
  await expect(page.locator('#auth-email')).toHaveCount(1);
  await expect(page.locator('#auth-password')).toHaveCount(1);
});

test('language transitions preserve input values and mounted fields', async ({ page }) => {
  await prepare(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.locator('#auth-name').fill('Motion QA');
  await page.locator('#auth-workspace').fill('Motion workspace');
  await page.locator('#auth-email').fill('motion@example.invalid');
  await page.locator('#auth-password').fill('motion-only-password');
  const name = await page.locator('#auth-name').elementHandle();
  const email = await page.locator('#auth-email').elementHandle();

  await page.getByRole('button', { name: 'Change language to English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  await expect(page.locator('#auth-name')).toHaveValue('Motion QA');
  await expect(page.locator('#auth-workspace')).toHaveValue('Motion workspace');
  await expect(page.locator('#auth-email')).toHaveValue('motion@example.invalid');
  await expect(page.locator('#auth-password')).toHaveValue('motion-only-password');
  expect(await name!.evaluate(element => element === document.querySelector('#auth-name'))).toBe(true);
  expect(await email!.evaluate(element => element === document.querySelector('#auth-email'))).toBe(true);

  await page.getByRole('button', { name: 'Mudar idioma para português', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crie seu espaço de trabalho' })).toBeVisible();
  await expect(page.locator('#auth-password')).toHaveValue('motion-only-password');
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(page.locator('#auth-password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click();
  await expect(page.locator('#auth-password')).toHaveAttribute('type', 'password');
});

test('native theme reveal cleans snapshots and handles rapid toggles', async ({ page }) => {
  await prepare(page);
  // Capture inside the browser so the short reveal cannot finish between assertions.
  await page.addInitScript(() => {
    type Probe = Window & { themeReveal?: { clips: (string | undefined)[]; background: string } };
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = update => {
      const transition = start(update);
      void transition.ready.then(() => requestAnimationFrame(() => {
        const animation = document.getAnimations().find(item => (item.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)');
        (window as Probe).themeReveal = {
          clips: (animation?.effect as KeyframeEffect | null)?.getKeyframes().map(frame => String(frame.clipPath ?? '')) || [],
          background: getComputedStyle(document.querySelector('#root > div')!).backgroundColor
        };
      })).catch(() => undefined);
      return transition;
    };
  });
  await page.goto('/');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect.poll(() => page.evaluate(() => (window as Window & { themeReveal?: unknown }).themeReveal)).toBeTruthy();
  const reveal = await page.evaluate(() => (window as Window & { themeReveal?: { clips: string[]; background: string } }).themeReveal!);
  expect(reveal.clips[0]).toMatch(/^circle\(0px/);
  expect(reveal.clips[1]).toMatch(/^circle\(/);
  expect(reveal.background).toBe('rgb(255, 255, 255)');
  await expect(page.locator('html')).not.toHaveClass(/spectr-theme-reveal/);
  expect(await page.evaluate(() => document.getAnimations().filter(item => (item.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)').length)).toBe(0);

  await toggle.evaluate(button => { for (let index = 0; index < 6; index += 1) (button as HTMLButtonElement).click(); });
  await expect(page.locator('html')).toHaveClass('light');
  await toggle.evaluate(button => { for (let index = 0; index < 5; index += 1) (button as HTMLButtonElement).click(); });
  await expect(page.locator('html')).toHaveClass('dark');
  expect(await page.evaluate(() => localStorage.getItem('spectr_theme'))).toBe('dark');
});

test('theme fallback renders intermediate colors and reduced motion stays immediate', async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { configurable: true, value: undefined }));
  await page.goto('/');
  await expect(page.locator('[data-theme-toggle]')).toBeVisible();
  const fallback = await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click();
    const element = document.querySelector('#root > div')!;
    const active = document.documentElement.classList.contains('spectr-theme-colors');
    const colors: string[] = [];
    const start = performance.now();
    while (performance.now() - start < 350) {
      colors.push(getComputedStyle(element).backgroundColor);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return { active, colors };
  });
  expect(fallback.active).toBe(true);
  expect(fallback.colors.some(color => color !== 'rgb(28, 28, 28)' && color !== 'rgb(255, 255, 255)')).toBe(true);
  await expect(page.locator('html')).toHaveClass('light');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const immediate = await page.evaluate(() => {
    let nativeCalls = 0;
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: () => { nativeCalls += 1; throw new Error('Reduced motion must not start a reveal'); } });
    document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click();
    return { nativeCalls, classes: document.documentElement.className };
  });
  expect(immediate.nativeCalls).toBe(0);
  expect(immediate.classes).toBe('dark');
});

test('animated menus preserve keyboard focus, draft values and mobile search', async ({ page }) => {
  await prepare(page, true);
  await page.goto('/');
  let language = page.getByRole('button', { name: 'Selecionar idioma da interface', exact: true });
  await expect(language).toBeVisible();
  const width = (await language.boundingBox())!.width;
  await language.click();
  await page.getByRole('button', { name: /English/ }).click();
  language = page.getByRole('button', { name: 'Select interface language', exact: true });
  expect((await language.boundingBox())!.width).toBe(width);
  await expect(page.locator('#language-options')).toHaveCount(0);
  await language.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#language-options')).toHaveCount(0);
  await expect(language).toBeFocused();

  const workspace = page.getByRole('button', { name: 'Select workspace: Motion Workspace', exact: true });
  await workspace.click();
  const panel = page.locator('#workspace-switcher-panel');
  await panel.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const name = page.getByLabel('Workspace name', { exact: true });
  await expect(name).toBeFocused();
  await name.fill('New motion workspace');
  await panel.locator('form').getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(panel.getByRole('alert')).toHaveText('Workspace temporarily unavailable');
  await expect(name).toHaveValue('New motion workspace');
  await panel.getByRole('button', { name: 'Cancel creation', exact: true }).click();
  await expect(name).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Create workspace', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(workspace).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Control+k');
  const search = page.locator('#mobile-collection-search');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search collections', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion menus open immediately and remain dismissible', async ({ page }) => {
  await prepare(page, true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const language = page.getByRole('button', { name: 'Selecionar idioma da interface', exact: true });
  await expect(language).toBeVisible();
  await language.focus();
  const opacity = await language.evaluate(async button => {
    (button as HTMLButtonElement).click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return getComputedStyle(document.getElementById('language-options')!).opacity;
  });
  expect(opacity).toBe('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#language-options')).toHaveCount(0);
  await expect(language).toBeFocused();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole('button', { name: 'Selecionar workspace: Motion Workspace', exact: true }).click();
  await page.locator('#workspace-switcher-panel').getByRole('button', { name: 'Criar workspace', exact: true }).click();
  await expect(page.getByLabel('Nome do workspace', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#workspace-switcher-panel')).toHaveCount(0);
});
