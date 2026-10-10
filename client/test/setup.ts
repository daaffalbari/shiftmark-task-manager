import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register({ url: 'http://localhost:5173' });

const { afterEach, expect } = await import('bun:test');
const { cleanup } = await import('@testing-library/react');
const { default: _default, ...matchers } = await import('@testing-library/jest-dom/matchers');
expect.extend(matchers);
afterEach(() => { cleanup(); });
