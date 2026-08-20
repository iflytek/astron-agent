import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapProviderToVendor,
  getSpecificProviderOptions,
} from '../src/pages/model-management/utils/provider-group.ts';
import { ModelProviderType } from '../src/types/model.ts';

// OrcaRouter is registered as a named provider in the Official Providers catalog.
test('ModelProviderType includes ORCAROUTER', () => {
  assert.ok('ORCAROUTER' in ModelProviderType);
  assert.equal(ModelProviderType.ORCAROUTER, 'orcarouter');
});

// OrcaRouter exposes an OpenAI-compatible chat completions endpoint, so it must
// map to the OpenAI vendor group (openai-compatible).
test('orcarouter maps to the OpenAI-compatible vendor', () => {
  assert.equal(
    mapProviderToVendor(ModelProviderType.ORCAROUTER),
    ModelProviderType.OPENAI
  );
});

// It must appear as a selectable provider option on the Official Providers page.
test('getSpecificProviderOptions includes the OrcaRouter option', () => {
  const specificOptions = getSpecificProviderOptions();
  const orcaOption = specificOptions.find(
    option => option.value === ModelProviderType.ORCAROUTER
  );
  assert.ok(orcaOption, 'getSpecificProviderOptions should include OrcaRouter');
  assert.equal(orcaOption.label, 'OrcaRouter');
});

// Other OpenAI-compatible providers must keep mapping to the OpenAI vendor.
test('existing OpenAI-compatible providers still map to the OpenAI vendor', () => {
  assert.equal(
    mapProviderToVendor(ModelProviderType.DEEPSEEK),
    ModelProviderType.OPENAI
  );
  assert.equal(
    mapProviderToVendor(ModelProviderType.MINIMAX),
    ModelProviderType.OPENAI
  );
});
