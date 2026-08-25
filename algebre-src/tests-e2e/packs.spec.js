import { test, expect } from '@playwright/test';

test('registered calculation pack runs through the same mobile-first runtime',async({page,browserName})=>{
  await page.goto('./?pack=calcul-litteral-3eme');
  await expect(page.locator('.home-screen')).toHaveAttribute('data-pack','calcul-litteral-3eme');
  await expect(page.getByRole('heading',{name:'Calcul littéral'})).toBeVisible();

  await page.getByRole('button',{name:/Développer et réduire/}).click();
  await expect(page.locator('.practice-screen')).toHaveAttribute('data-pack','calcul-litteral-3eme');
  await expect(page.locator('.workspace')).toHaveClass(/workspace--aligned/);
  await expect(page.locator('.math-row .relation-mark').first()).toHaveText('=');
  await expect(page.locator('.keyboard')).toHaveAttribute('data-profile','calcul-litteral-3eme');

  if(browserName==='chromium'){
    await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','compact');
    await expect(page.locator('.key-compact-row')).toBeVisible();
  }else{
    await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','full');
    await expect(page.locator('.key-grid')).toBeVisible();
    await expect(page.getByRole('button',{name:'Nouvelle ligne'})).toBeVisible();
  }
});

test('aligned calculation pack keeps the full keyboard on a narrow viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./?pack=calcul-litteral-3eme');
  await page.getByRole('button',{name:/Développer/}).first().click();
  await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','full');
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});
