const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Abrir o arquivo local
  const filePath = 'file://' + path.resolve('pages/projector_master.html');
  console.log('Opening:', filePath);

  await page.goto(filePath);
  await page.setViewportSize({ width: 1280, height: 720 });

  // Esperar um pouco para o Three.js (se houver) e o painel carregarem
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'projector_master_verify.png' });
  console.log('Screenshot saved to projector_master_verify.png');

  await browser.close();
})();
