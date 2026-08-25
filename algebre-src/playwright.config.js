import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests-e2e',
  timeout:30_000,
  expect:{timeout:5_000},
  fullyParallel:false,
  retries:1,
  reporter:'line',
  use:{baseURL:'http://127.0.0.1:4173/mini-anki-fractions-puissances/algebre/',trace:'retain-on-failure'},
  webServer:{command:'npm run build && npx vite preview --host 127.0.0.1 --port 4173',port:4173,reuseExistingServer:false,timeout:120_000},
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome']}},
    {name:'webkit-iphone',use:{...devices['iPhone 13']}}
  ]
});
