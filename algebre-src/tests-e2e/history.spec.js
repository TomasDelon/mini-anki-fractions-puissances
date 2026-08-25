import { test, expect } from '@playwright/test';

async function setField(page,value){
  await page.locator('.math-row math-field').first().evaluate((field,latex)=>{
    field.value=latex;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.focus();
  },value);
}

async function fieldValue(page,index=0){
  return page.locator('.math-row math-field').nth(index).evaluate(field=>field.value);
}

test('undo and redo restore mathematical edits with touch-sized controls',async({page})=>{
  await page.setViewportSize({width:320,height:760});
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();

  const undo=page.getByRole('button',{name:'Annuler'});
  const redo=page.getByRole('button',{name:'Rétablir'});
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await setField(page,'x+1=2');
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(()=>fieldValue(page)).toBe('');
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect.poll(()=>fieldValue(page)).toBe('x+1=2');

  const boxes=await Promise.all([undo,redo].map(button=>button.boundingBox()));
  for(const box of boxes){
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});

test('structural line creation participates in the same history',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  const field=page.locator('.math-row math-field').first();
  await field.focus();
  await field.press('Enter');
  await expect(page.locator('.math-row')).toHaveCount(2);

  await page.getByRole('button',{name:'Annuler'}).click();
  await expect(page.locator('.math-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Rétablir'}).click();
  await expect(page.locator('.math-row')).toHaveCount(2);
});

test('desktop Ctrl+Z and Ctrl+Shift+Z use the global derivation history',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  await setField(page,'x=4');
  const field=page.locator('.math-row math-field').first();
  await field.press('Control+z');
  await expect.poll(()=>fieldValue(page)).toBe('');
  await field.press('Control+Shift+z');
  await expect.poll(()=>fieldValue(page)).toBe('x=4');
});
