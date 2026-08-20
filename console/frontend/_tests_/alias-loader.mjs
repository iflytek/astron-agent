// Minimal ESM loader that maps the `@/` path alias to `<cwd>/src/`, so unit tests
// can import modules that reference the Vite/tsconfig `@/*` alias (which ts-node's
// default ESM resolver does not apply). Test-only; not part of the app runtime.
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const cwd = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const url = pathToFileURL(`${cwd}/src/${rel}.ts`).href;
    return nextResolve(url, context);
  }
  return nextResolve(specifier, context);
}
