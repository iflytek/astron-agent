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

test('network, authentication and local failures still need a caller toast', () => {
  for (const error of [
    { code: 100, message: '网络错误' },
    { code: 101, message: '尚未登录' },
    new Error('发布失败'),
    { message: '发布失败' },
    null,
  ]) {
    assert.equal(shouldShowRequestError(error), true);
  }
});
