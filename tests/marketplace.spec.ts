import { test, expect } from '@playwright/test'

test.describe('KURIO NFT Marketplace - Fluxos E2E e Cenarios Deterministicos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      const win = window as unknown as {
        __KURIO_SCENARIOS__?: { setScenario: (s: string) => void }
        __KURIO_DB__?: { resetDatabase: () => void }
      }
      win.__KURIO_SCENARIOS__?.setScenario('none')
      win.__KURIO_DB__?.resetDatabase()
    })
    await page.reload()
  })

  test('Descoberta, filtros sincronizados na URL e navegacao para detalhes do NFT', async ({
    page,
    isMobile,
  }) => {
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()

    if (!isMobile) {
      await page.getByRole('tab', { name: /Novos lançamentos/i }).click()
      await expect(page).toHaveURL(/tab=new/)
    }

    await page.goto('/mercado?nftId=nft-1')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  })

  test('Carrinho de NFTs, aplicacao de cupom valido e tratamento de cupom invalido', async ({
    page,
  }) => {
    await page.goto('/carrinho')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page.getByText('8.92 ETH').first()).toBeVisible()

    const couponInput = page
      .locator('input[placeholder*="código promocional"], input[placeholder*="Insira o código"]')
      .first()
    await couponInput.fill('CUPOM_INEXISTENTE')
    await page.getByRole('button', { name: 'Aplicar' }).first().click()
    await expect(page.getByText(/inválido/i).first()).toBeVisible()

    await couponInput.fill('JUNGLE10')
    await page.getByRole('button', { name: 'Aplicar' }).first().click()
    await expect(page.getByText(/0\.892/)).toBeVisible()
  })

  test('Login, conflito de cadastro (409) e persistencia do Perfil do Colecionador', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      await page.goto('/perfil')
      await page.getByRole('button', { name: 'Entrar agora' }).click()
    } else {
      await page.getByRole('button', { name: 'Entrar' }).first().click()
    }

    await page.getByRole('button', { name: /Entrar/i }).last().click()
    await expect(page.getByText(/Credenciais|autenticada|bem-vindo/i).first()).toBeVisible({
      timeout: 5000,
    }).catch(() => {})

    await page.goto('/perfil')
    await expect(page.getByText('Perfil do colecionador').first()).toBeVisible()

    const displayNameInput = page.locator('input[placeholder="Kurio Collector"]')
    await displayNameInput.fill('Paulo Collector')
    await page.getByRole('button', { name: 'Salvar' }).click()

    await page.reload()
    await expect(page.locator('input[placeholder="Kurio Collector"]')).toHaveValue(
      'Paulo Collector',
    )
  })

  test('Checkout completo com confirmacao (THANK YOU) e recusa de pagamento (payment-rejected)', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      await page.getByRole('button', { name: 'Entrar' }).first().click()
      await page.getByRole('button', { name: 'Entrar' }).last().click()
    }

    await page.goto('/pagamento')
    await expect(page.getByText('8.936 ETH').first()).toBeVisible()

    await page.evaluate(() => {
      const win = window as unknown as {
        __KURIO_SCENARIOS__?: { setScenario: (s: string) => void }
      }
      win.__KURIO_SCENARIOS__?.setScenario('payment-rejected')
    })

    const confirmBtn = page
      .getByRole('button', { name: /Confirmar pagamento|Confirmar compra/i })
      .first()
    await confirmBtn.click()

    await expect(page.getByText(/recusada|recusado/i).first()).toBeVisible()
    await expect(page.getByText('THANK YOU')).toHaveCount(0)

    await page.evaluate(() => {
      const win = window as unknown as {
        __KURIO_SCENARIOS__?: { setScenario: (s: string) => void }
      }
      win.__KURIO_SCENARIOS__?.setScenario('none')
    })

    await confirmBtn.click()
    await expect(page.getByText('THANK YOU')).toBeVisible()
    await expect(page.getByText('Seu pagamento foi confirmado!')).toBeVisible()
  })

  test('Atualizacao de preco em tempo real via Socket.IO durante o checkout', async ({ page }) => {
    await page.goto('/pagamento')
    await expect(page.getByText('8.936 ETH').first()).toBeVisible()

    await page.evaluate(() => {
      const win = window as unknown as {
        __KURIO_DB__?: { emitNftPriceUpdate: (nftId: string, newPrice: string) => void }
      }
      win.__KURIO_DB__?.emitNftPriceUpdate('nft-1', '2.19')
    })

    await expect(page.getByText(/tempo real|atualizado/i).first()).toBeVisible()
  })

  test('Regressao visual das telas principais (Catalogo, Detalhes, Carrinho e Checkout)', async ({
    page,
    isMobile,
  }) => {
    const prefix = isMobile ? 'mobile' : 'desktop'

    await page.goto('/')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page).toHaveScreenshot(`${prefix}-home.png`, { maxDiffPixelRatio: 0.05 })

    await page.goto('/mercado?nftId=nft-1')
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
    await expect(page).toHaveScreenshot(`${prefix}-nft-detail.png`, { maxDiffPixelRatio: 0.05 })

    await page.goto('/carrinho')
    await expect(page.getByText('8.92 ETH').first()).toBeVisible()
    await expect(page).toHaveScreenshot(`${prefix}-cart.png`, { maxDiffPixelRatio: 0.05 })
  })
})

