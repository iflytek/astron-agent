import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowRequestError } from '../src/utils/http-error.ts';

test('publish business failures are displayed only by the HTTP interceptor', () => {
  assert.equal(
    shouldShowRequestError({
      code: 8103,
      message: '工作流版本发布结果异常',
    }),
    false
  );
  assert.equal(
    shouldShowRequestError({ code: 80004, desc: '空间不存在' }),
    false
  );
});

test('network and local failures still need a caller toast', () => {
  for (const error of [
    { code: 100, message: '网络错误' },
    new Error('发布失败'),
    { message: '发布失败' },
    null,
  ]) {
    assert.equal(shouldShowRequestError(error), true);
  }
});

test('HTTP failures and authentication redirects need no second caller toast', () => {
  for (const code of [400, 403, 502, 101]) {
    assert.equal(shouldShowRequestError({ code, message: '请求失败' }), false);
  }
});
