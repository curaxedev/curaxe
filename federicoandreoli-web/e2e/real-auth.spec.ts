/**
 * E2E contro il backend Laravel reale (niente mock).
 *
 * Prerequisiti:
 *   1. API attiva:      cd ../federicoandreoli-api && php artisan serve --port=8010
 *   2. DB seedato:      php artisan migrate --seed
 *   3. Frontend reale:  VITE_USE_MOCKS=false API_PROXY_TARGET=http://127.0.0.1:8010 npm run dev
 *   4. Lancio:          E2E_REAL=1 npx playwright test e2e/real-auth.spec.ts
 */
import { expect, test, type Page } from '@playwright/test'

const REAL_MODE = process.env.E2E_REAL === '1'

/** Chiude il cookie banner che altrimenti intercetta i click sul form. */
async function dismissCookieBanner(page: Page): Promise<void> {
  const onlyNecessary = page.getByRole('button', { name: 'Solo necessari' })
  if (await onlyNecessary.isVisible().catch(() => false)) {
    await onlyNecessary.click()
  }
}

/**
 * Porta il login al form password. Per email note il wizard salta la scelta
 * del metodo e apre direttamente il canale suggerito (OTP o password).
 */
async function openPasswordForm(page: Page): Promise<void> {
  await expect(page.getByText('Passo 2 di 2')).toBeVisible()

  const passwordInput = page.locator('input[name="password"]')
  if (await passwordInput.isVisible()) return

  const backToChoice = page.getByRole('button', { name: /Torna alla scelta/ })
  if (await backToChoice.isVisible()) {
    await backToChoice.click()
  }
  await page.getByRole('button', { name: /Inserisci password/ }).click()
  await expect(passwordInput).toBeVisible()
}

test.describe('Auth reale (Laravel + Sanctum)', () => {
  test.skip(!REAL_MODE, 'Eseguito solo con E2E_REAL=1 e backend attivo')

  test('agenzia accede con password e arriva in dashboard', async ({ page }) => {
    await page.goto('/accedi')
    await dismissCookieBanner(page)

    await page.getByRole('textbox', { name: 'Email' }).fill('info@auracare.it')
    await page.getByRole('button', { name: 'Avanti' }).click()

    await openPasswordForm(page)
    await page.locator('input[name="password"]').fill('DemoPass123!')
    await page.getByRole('button', { name: 'Accedi', exact: true }).click()

    await expect(page).toHaveURL(/\/dashboard\/agenzia/)
  })

  test('password errata mostra errore del backend', async ({ page }) => {
    await page.goto('/accedi')
    await dismissCookieBanner(page)

    await page.getByRole('textbox', { name: 'Email' }).fill('info@auracare.it')
    await page.getByRole('button', { name: 'Avanti' }).click()

    await openPasswordForm(page)
    await page.locator('input[name="password"]').fill('PasswordSbagliata1!')
    await page.getByRole('button', { name: 'Accedi', exact: true }).click()

    await expect(page.getByRole('alert')).toContainText('Credenziali non corrette')
  })

  test('registrazione professionista reale in 2 step', async ({ page }) => {
    await page.goto('/registrazione/offro/chi-sei')
    await dismissCookieBanner(page)
    await expect(page.getByRole('heading', { name: /Chi sei/i })).toBeVisible()

    await page.getByRole('button', { name: /Badante/i }).click()
    await page.getByPlaceholder(/Milano/i).fill('Milano centro')
    await page.getByRole('button', { name: 'Avanti' }).click()

    await expect(page.getByRole('heading', { name: /Crea il tuo account/i })).toBeVisible()
    await page.getByPlaceholder(/Maria Rossi|nome@email/i).first().fill('Test Professionista E2E')
    await page.locator('input[type="email"]').fill(`pro-reale-${Date.now()}@email.it`)

    const switches = page.locator('[role="checkbox"]')
    const count = await switches.count()
    for (let i = 0; i < Math.min(count, 3); i++) {
      const sw = switches.nth(i)
      if ((await sw.getAttribute('aria-checked')) !== 'true') {
        await sw.click()
      }
    }

    await page.getByRole('button', { name: /Crea account professionista/i }).click()
    await expect(page).toHaveURL(/\/registrazione\/fine/)
    await expect(page.getByRole('heading', { name: 'Registrazione inviata' })).toBeVisible()
  })

  test('account OTP che tenta la password viene reindirizzato al canale giusto', async ({ page }) => {
    await page.goto('/accedi')
    await dismissCookieBanner(page)

    await page.getByRole('textbox', { name: 'Email' }).fill('maria.rossi@email.it')
    await page.getByRole('button', { name: 'Avanti' }).click()

    await openPasswordForm(page)
    await page.locator('input[name="password"]').fill('QualsiasiPass1!')
    await page.getByRole('button', { name: 'Accedi', exact: true }).click()

    await expect(page.getByRole('alert')).toContainText('codice via email')
  })
})
