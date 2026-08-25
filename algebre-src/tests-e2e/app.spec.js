import { test, expect } from '@playwright/test';

const ORDER=['7','8','9','plus','minus','times','4','5','6','x','square','equals','1','2','3','pm','parentheses','sqrt','0','fraction','abs','or','up','down'];

async function openSimple(page){
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  await expect(page.locator('.practice-screen')).toBeVisible();
  await expect(page.locator('.math-row math-field')).toHaveCount(1);
}
async function fieldValue(page){ return page.locator('.math-row math-field').last().evaluate(m=>m.value); }
async function setField(page,value){
  await page.locator('.math-row math-field').last().evaluate((m,v)=>{m.value=v;m.dispatchEvent(new Event('input',{bubbles:true}));m.focus();},value);
}

test('keyboard is stable, complete and ordered',async({page})=>{
  await openSimple(page);
  const order=await page.locator('.key-grid .key').evaluateAll(nodes=>nodes.map(n=>n.dataset.key));
  expect(order).toEqual(ORDER);
  await expect(page.getByRole('button',{name:'Nouvelle ligne'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Multiplier'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Fraction'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Racine carrée'})).toBeVisible();
});

test('x then square produces a postfix square',async({page})=>{
  await openSimple(page);
  await page.getByRole('button',{name:'x',exact:true}).click();
  await page.getByRole('button',{name:'Carré',exact:true}).click();
  const v=await fieldValue(page);
  expect(v).toContain('x');
  expect(v).toMatch(/\^\{?2\}?/);
});

test('ou closes text mode before the following x',async({page})=>{
  await openSimple(page);
  await page.getByRole('button',{name:'x',exact:true}).click();
  await page.getByRole('button',{name:'ou',exact:true}).click();
  await page.getByRole('button',{name:'x',exact:true}).click();
  const v=(await fieldValue(page)).replace(/\s+/g,'');
  expect(v).toContain('\\text{ou}x');
  expect(v).not.toContain('\\text{ou x}');
});

test('physical and virtual backspace delete an empty new row',async({page})=>{
  await openSimple(page);
  await page.getByRole('button',{name:'Nouvelle ligne'}).click();
  await expect(page.locator('.math-row')).toHaveCount(2);
  await page.keyboard.press('Backspace');
  await expect(page.locator('.math-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Nouvelle ligne'}).click();
  await expect(page.locator('.math-row')).toHaveCount(2);
  await page.getByRole('button',{name:'Effacer'}).click();
  await expect(page.locator('.math-row')).toHaveCount(1);
});

test('selection mode extends selection with arrows',async({page})=>{
  await openSimple(page);
  await setField(page,'x+1');
  await page.locator('.math-row math-field').evaluate(m=>{m.position=0;m.focus();});
  await page.getByRole('button',{name:'Mode sélection'}).click();
  await page.getByRole('button',{name:'Déplacer à droite'}).click();
  const collapsed=await page.locator('.math-row math-field').evaluate(m=>m.selectionIsCollapsed);
  expect(collapsed).toBe(false);
});

test('square wraps a selection',async({page})=>{
  await openSimple(page);
  await setField(page,'x+1');
  await page.locator('.math-row math-field').evaluate(m=>{m.select();m.focus();});
  await page.getByRole('button',{name:'Carré',exact:true}).click();
  const v=await fieldValue(page);
  expect(v).toContain('x+1');
  expect(v).toMatch(/\^\{?2\}?/);
});

test('fraction and square-root keys insert real structures',async({page})=>{
  await openSimple(page);
  await page.getByRole('button',{name:'Fraction'}).click();
  expect(await fieldValue(page)).toContain('\\frac');
  await setField(page,'');
  await page.getByRole('button',{name:'Racine carrée'}).click();
  expect(await fieldValue(page)).toContain('\\sqrt');
});

test('correct answer -> next exercise visibly refreshes the prompt and keeps a healthy keyboard',async({page})=>{
  await openSimple(page);
  const promptLocator=page.locator('.prompt-math');
  const oldPromptNode=await promptLocator.elementHandle();
  const prompt=await promptLocator.evaluate(m=>m.textContent.trim().replace(/^\\displaystyle\s*/,''));
  const answer=await page.evaluate(p=>{
    const a=window.__ALGEBRE_TEST__.analyze(p);
    if(a.kind!=='ok'||a.set.kind!=='finite'||a.set.values.length!==1)throw new Error('Unexpected simple exercise');
    return a.set.values[0].toLatex();
  },prompt);
  await setField(page,`x=${answer}`);
  await page.getByRole('button',{name:'Vérifier'}).click();
  await expect(page.getByText('Correct.')).toBeVisible();
  await expect(page.locator('.keyboard')).toHaveCount(0);
  await page.getByRole('button',{name:'Exercice suivant'}).click();

  // Regression for MathLive static rendering: a new exercise must reconnect a
  // fresh <math-span>; changing only its textContent can leave the old visual.
  await expect.poll(()=>oldPromptNode.evaluate(el=>el.isConnected)).toBe(false);
  const nextPrompt=await promptLocator.evaluate(m=>m.textContent.trim().replace(/^\\displaystyle\s*/,''));
  expect(nextPrompt).not.toBe(prompt);

  await expect(page.locator('.keyboard')).toBeVisible();
  await expect(page.getByRole('button',{name:'Nouvelle ligne'})).toBeVisible();
  await page.getByRole('button',{name:'x',exact:true}).click();
  expect(await fieldValue(page)).toContain('x');
});

test('320px viewport has no horizontal page overflow',async({page})=>{
  await page.setViewportSize({width:320,height:760});
  await openSimple(page);
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});

test('app reloads offline after the service worker is ready',async({page,browserName,context})=>{
  test.skip(browserName!=='chromium','Offline smoke test is run once in Chromium');
  await openSimple(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller){location.reload();}});
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#app')).toBeVisible();
  await context.setOffline(false);
});
