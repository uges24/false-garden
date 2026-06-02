import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  require.resolve('playwright');
  console.log('Playwright is available. Use scripts/capture-water-target.ps1 for the current Chrome-based capture workflow.');
} catch {
  console.log('Playwright is not installed in this repo; using Chrome headless PowerShell capture scripts instead.');
}
