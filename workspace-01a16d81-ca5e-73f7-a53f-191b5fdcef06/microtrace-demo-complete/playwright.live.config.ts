import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests/live-e2e',timeout:40_000,expect:{timeout:10_000},workers:1,fullyParallel:false,
 reporter:[['list'],['json',{outputFile:'test-results/live-results.json'}]],
 use:{baseURL:'http://127.0.0.1:5303',timezoneId:'Asia/Kolkata',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--no-sandbox']}},
 projects:[{name:'Live desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},{name:'Live phone',use:{...devices['Pixel 5']}},{name:'Live small phone',use:{viewport:{width:320,height:780},isMobile:true,hasTouch:true}},{name:'Live tablet',use:{viewport:{width:834,height:1112},isMobile:true,hasTouch:true}}],
 webServer:{command:'npm run preview -- --host 0.0.0.0 --port 5303 --strictPort',url:'http://127.0.0.1:5303',reuseExistingServer:!process.env.CI,timeout:120_000},
});
