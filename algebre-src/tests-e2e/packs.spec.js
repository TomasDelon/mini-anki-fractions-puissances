import { test, expect } from '@playwright/test';

async function setLastField(page,value){
  await page.locator('.math-row math-field').last().evaluate((field,latex)=>{
    field.value=latex;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.focus();
  },value);
}

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

test('fractions pack uses exact aligned calculations and responsive fraction tools',async({page,browserName})=>{
  await page.goto('./?pack=fractions');
  await expect(page.locator('.home-screen')).toHaveAttribute('data-pack','fractions');
  await expect(page.getByRole('heading',{name:'Fractions'})).toBeVisible();
  await page.getByRole('button',{name:/Simplifier une fraction/}).click();

  await expect(page.locator('.practice-screen')).toHaveAttribute('data-pack','fractions');
  await expect(page.locator('.workspace')).toHaveClass(/workspace--aligned/);
  await expect(page.locator('.math-row .relation-mark').first()).toHaveText('=');
  await expect(page.locator('.keyboard')).toHaveAttribute('data-profile','fractions');
  await expect(page.getByRole('button',{name:'Fraction'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Diviser'})).toBeVisible();

  if(browserName==='chromium'){
    await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','compact');
  }else{
    await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','full');
    await expect(page.getByRole('button',{name:'Nouvelle ligne'})).toBeVisible();
  }
});

test('fractions pack can solve, validate and move to a visibly new exercise',async({page})=>{
  const sessionKey='math-trainer-fractions-session-v1';
  await page.goto('./?pack=fractions');
  await page.getByRole('button',{name:/Simplifier une fraction/}).click();
  const firstPrompt=await page.locator('.prompt-math').textContent();
  const expected=await expect.poll(async()=>page.evaluate(key=>{
    const raw=localStorage.getItem(key);if(!raw)return '';
    const session=JSON.parse(raw);
    return window.__ALGEBRE_TEST__.pack.generateExercise(session.category,session.seed).expectedLatex;
  },sessionKey)).not.toBe('');

  const answer=await page.evaluate(key=>{
    const session=JSON.parse(localStorage.getItem(key));
    return window.__ALGEBRE_TEST__.pack.generateExercise(session.category,session.seed).expectedLatex;
  },sessionKey);
  await setLastField(page,answer);
  await page.getByRole('button',{name:'Vérifier'}).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await page.getByRole('button',{name:'Exercice suivant'}).click();
  await expect(page.getByText('Correct.')).toHaveCount(0);
  await expect.poll(async()=>page.locator('.prompt-math').textContent()).not.toBe(firstPrompt);
});

test('fractions mobile layout stays inside a 320px viewport',async({page})=>{
  await page.setViewportSize({width:320,height:760});
  await page.goto('./?pack=fractions');
  await page.getByRole('button',{name:/Addition et soustraction/}).click();
  await expect(page.locator('.keyboard')).toHaveAttribute('data-display-mode','full');
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});
