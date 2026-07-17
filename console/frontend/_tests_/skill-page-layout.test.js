import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const stylesheet = readFileSync(
  resolve(
    frontendRoot,
    'src/pages/resource-management/skill-page/index.module.scss'
  ),
  'utf8'
);
const component = readFileSync(
  resolve(frontendRoot, 'src/pages/resource-management/skill-page/index.tsx'),
  'utf8'
);

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

function assertRuleContains(selector, expected, message) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = stylesheet.match(
    new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`)
  );
  if (!rule?.[0].includes(expected)) {
    throw new Error(message);
  }
}

function assertRuleAfterContains(anchor, selector, expected, message) {
  const anchorIndex = stylesheet.indexOf(anchor);
  if (anchorIndex === -1) {
    throw new Error(`missing stylesheet anchor: ${anchor}`);
  }
  const scopedStylesheet = stylesheet.slice(anchorIndex);
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = scopedStylesheet.match(
    new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`)
  );
  if (!rule?.[0].includes(expected)) {
    throw new Error(message);
  }
}

assertIncludes(
  component,
  'styles.editorActions',
  'file editor actions should use a dedicated non-shrinking action group'
);

assertIncludes(
  component,
  'styles.editorDescription',
  'long skill descriptions should render in a bounded metadata row'
);

assertRuleContains(
  '.editorHeader',
  'align-items: flex-start',
  'editor header should keep actions at the top instead of centered beside long text'
);

assertRuleContains(
  '.editorActions',
  'flex-shrink: 0',
  'editor action group should not be squeezed by long descriptions'
);

assertRuleContains(
  '.editorDescription',
  'max-height:',
  'skill descriptions should have a visible height boundary'
);

assertRuleContains(
  '.editorCanvas',
  'overflow: hidden',
  'editor canvas should keep editor and preview scrolling inside the panel'
);

assertRuleContains(
  '.preview',
  'min-height: 100%',
  'markdown preview should fill the available editor canvas height'
);

assertRuleAfterContains(
  '@media (max-width: 1100px)',
  '.editorActions',
  'width: 100%',
  'narrow editor actions should use full width so buttons can wrap cleanly'
);
