import assert from 'node:assert/strict';
import test from 'node:test';
import { workflowBotId, workflowBotNumber } from './workflow-metadata.ts';

test('workflow bot IDs preserve string precision and ignore malformed metadata', () => {
  assert.equal(
    workflowBotId('{"botId":"9007199254740993"}'),
    '9007199254740993'
  );
  assert.equal(workflowBotId('{"botId":42}'), 42);
  for (const invalid of [undefined, '', '{', 'null', '[]', '{"botId":{}}'])
    assert.equal(workflowBotId(invalid), undefined);
});

test('numeric-only publish props never round a string identifier', () => {
  assert.equal(workflowBotNumber('{"botId":"42"}'), 42);
  assert.equal(workflowBotNumber('{"botId":42}'), 42);
  assert.equal(workflowBotNumber('{"botId":"9007199254740993"}'), undefined);
  assert.equal(workflowBotNumber('{"botId":"not-an-id"}'), undefined);
});
