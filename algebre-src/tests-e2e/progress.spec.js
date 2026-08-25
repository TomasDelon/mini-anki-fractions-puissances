import { test, expect } from '@playwright/test';

const PROGRESS_KEY='math-trainer-equations-3eme-progress-v1';
const SESSION_KEY='math-trainer-equations-3eme-session-v2';

async function setLastField(page,value){
  await page.locator('.math-row math-field').last().evaluate((field,latex)=>{
    field.value=latex;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.focus();
  },value);
}

async function solveCurrentSimpleExercise(page){
  const prompt=await page.locator('.prompt-math').evaluate(node=>node.textContent.trim().replace(/^\\displaystyle\s*/,''));
  const answer=await page.evaluate(latex=>{
    const result=window.__ALGEBRE_TEST__.analyze(latex);
    if(result.kind!=='ok'||result.set.kind!=='finite'||result.set.values.length!==1) throw new Error('Unexpected simple exercise');
    return result.set.values[0].toLatex();
  },prompt);
  await setLastField(page,`x=${answer}`);
  await page.getByRole('button',{name:'Vérifier'}).click();
  await expect(page.getByText('Correct.')).toBeVisible();
}

test('a completed exercise updates persistent skill progress and the home screen shows it',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  await solveCurrentSimpleExercise(page);

  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS_KEY);
  expect(progress.completed).toBe(1);
  expect(progress.skills['equation-isolation'].attempts).toBe(1);
  expect(progress.recentExercises).toHaveLength(1);
  expect(await page.evaluate(key=>localStorage.getItem(key),SESSION_KEY)).toBeNull();

  await page.getByRole('button',{name:'Retour aux catégories'}).click();
  const simple=page.getByRole('button',{name:/Équations simples/});
  await expect(simple.locator('.category-progress')).toBeVisible();
  await expect(simple.locator('.category-progress')).toHaveAttribute('aria-label',/Progression estimée/);
  await expect(page.getByRole('button',{name:/Reprendre/})).toHaveCount(0);
});

test('progressive hints reveal strategy before mathematics and count as assistance',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();

  await page.getByRole('button',{name:'Indice',exact:true}).click();
  await expect(page.locator('.hint-item--text')).toHaveCount(1);
  await expect(page.locator('.hint-item--text')).toContainText(/même opération/i);
  await expect(page.locator('.hint-item--math')).toHaveCount(0);

  await page.getByRole('button',{name:'Indice suivant',exact:true}).click();
  await expect(page.locator('.hint-item--math').first()).toBeVisible();
  await solveCurrentSimpleExercise(page);

  const progress=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS_KEY);
  expect(progress.completed).toBe(1);
  expect(progress.skills['equation-isolation'].mastery).toBeLessThan(.9);
});

test('hint usage survives reload and resume without resetting assistance',async({page})=>{
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  await page.getByRole('button',{name:'Indice',exact:true}).click();
  await page.getByRole('button',{name:'Indice suivant',exact:true}).click();
  await expect(page.locator('.hint-item')).toHaveCount(2);

  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SESSION_KEY);
  expect(stored.attempt.hintCount).toBe(2);
  expect(stored.attempt.startedAt).toBeGreaterThan(0);

  await page.reload();
  await page.getByRole('button',{name:/Reprendre/}).click();
  await expect(page.locator('.hint-item')).toHaveCount(2);
  await expect(page.getByRole('button',{name:/Indice/})).toBeVisible();
});

test('progress indicators stay compact at 320px',async({page})=>{
  await page.addInitScript(key=>{
    localStorage.setItem(key,JSON.stringify({
      version:1,
      completed:4,
      skills:{'equation-isolation':{attempts:4,mastery:.9,streak:4,mistakes:0,totalDurationMs:40000,lastSeen:'2026-08-25T12:00:00.000Z'}},
      categories:{simple:{completed:4,mistakes:0,totalDurationMs:40000,lastSeen:'2026-08-25T12:00:00.000Z'}}
    }));
  },PROGRESS_KEY);
  await page.setViewportSize({width:320,height:760});
  await page.goto('./');
  await expect(page.locator('.category-progress').first()).toBeVisible();
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});

test('hint controls stay inside a 320px viewport',async({page})=>{
  await page.setViewportSize({width:320,height:760});
  await page.goto('./');
  await page.getByRole('button',{name:/Équations simples/}).click();
  await page.getByRole('button',{name:'Indice',exact:true}).click();
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.inner);
});
