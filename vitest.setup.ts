// Source - https://stackoverflow.com/a/77461808
// Posted by Alex Pavlov
// Retrieved 2026-01-15, License - CC BY-SA 4.0

// vitest.setup.js
import { expect } from 'vitest';
import * as matchers from 'jest-extended';

expect.extend(matchers);
