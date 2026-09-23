import { expect, test, type Page } from '@playwright/test'

async function demoLogin(page: Page, label: string) {
  await page.goto('/accedi')
  const row = page.locator('.auth-demo-row', { hasText: label })
  await expect(row.getByRole('button', { name: 'Accedi' })).toBeVisible({ timeout: 20_000 })
  await row.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 })
}

test.describe('Smoke journeys', () => {
  test('famiglia: login demo e pubblica richiesta', async ({ page }) => {
    await demoLogin(page, 'Famiglia')
    await expect(page).toHaveURL(/\/dashboard\/famiglia/)

    await page.getByRole('button', { name: /Pubblica|Nuova|richiesta/i }).first().click()
    // Section may already be open via nav — ensure form is visible
    const publishBtn = page.getByRole('button', { name: /Pubblica richiesta/i })
    if (!(await publishBtn.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /Pubblica/i }).first().click()
    }
    await expect(page.getByRole('heading', { name: /Pubblica|Nuova richiesta|richiesta/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('professionista: login, profilo e candidature', async ({ page }) => {
    await demoLogin(page, 'Badante')
    await expect(page).toHaveURL(/\/dashboard\/professionale/)

    await page.getByRole('button', { name: /Il mio profilo|Profilo/i }).first().click()
    await expect(page.getByRole('heading', { name: /Il mio profilo/i })).toBeVisible()

    await page.getByRole('button', { name: /Posizioni/i }).first().click()
    await expect(page.getByRole('heading', { name: /Posizioni|aperte/i })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('B2B agenzia: annunci e pipeline candidati', async ({ page }) => {
    await demoLogin(page, 'Agenzia B2B')
    await expect(page).toHaveURL(/\/dashboard\/agenzia/)

    await page.getByRole('button', { name: /annunci/i }).first().click()
    await expect(page.getByRole('heading', { name: /annunci/i })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /Candidat/i }).first().click()
    await expect(
      page.getByRole('heading', { name: /Candidature ricevute/i }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Pipeline:/i)).toBeVisible()
  })

  test('registrazione professionista in 2 step', async ({ page }) => {
    await page.goto('/registrazione/offro/chi-sei')
    await expect(page.getByRole('heading', { name: /Chi sei/i })).toBeVisible()

    await page.getByRole('button', { name: /Badante/i }).click()
    await page.getByPlaceholder(/Milano/i).fill('Milano centro')
    await page.getByRole('button', { name: 'Avanti' }).click()

    await expect(page.getByRole('heading', { name: /Crea il tuo account/i })).toBeVisible()
    await page.getByPlaceholder(/Maria Rossi|nome@email/i).first().fill('Test Professionista')
    await page.locator('input[type="email"]').fill(`pro-e2e-${Date.now()}@email.it`)

    // Consents — click switches
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
    await expect(page.getByRole('link', { name: /completa il profilo/i })).toBeVisible()
  })

  test('admin: wizard Stripe e passkey panel', async ({ page }) => {
    await demoLogin(page, 'Super Admin')
    await expect(page).toHaveURL(/\/dashboard\/admin/)

    await page.getByRole('button', { name: /Abbonamenti/i }).first().click()
    await expect(page.getByRole('heading', { name: /Pagamenti Stripe/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Procedura guidata landlord/i)).toBeVisible()

    await page.getByRole('button', { name: /Account|Il mio account/i }).first().click()
    await expect(page.getByRole('heading', { name: /Accesso sicuro \(Passkey\)/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
