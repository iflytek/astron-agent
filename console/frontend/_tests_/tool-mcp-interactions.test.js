import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

function load(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    name => {
      if (name.endsWith('.css')) return {};
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error(`Unmocked dependency: ${name}`);
    },
    module,
    module.exports
  );
  return module.exports;
}
const helpers = load(
  '../src/pages/resource-management/resource-tools/mcp-tools.ts',
  {
    './schema-form-model': load(
      '../src/pages/resource-management/resource-tools/schema-form-model.ts'
    ),
  }
);
const { httpTestTemplate } = load(
  '../src/pages/resource-management/resource-tools/http-test-template.ts',
  { './mcp-tools': helpers }
);

test('MCP inputs preserve falsy and nested defaults without inventing optional values', () => {
  assert.deepEqual(
    helpers.schemaExample({
      type: 'object',
      required: ['nested'],
      properties: {
        enabled: { type: 'boolean', default: false },
        limit: { type: 'number', default: 0 },
        nested: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' }, skip: { type: 'string' } },
        },
        omitted: { type: 'string' },
      },
    }),
    { enabled: false, limit: 0, nested: { name: '' } }
  );
  assert.deepEqual(helpers.schemaExample({ type: 'object' }), {});
  assert.throws(() => helpers.parseArguments('[]'), /JSON 对象/);
  assert.throws(() => helpers.parseArguments('null'), /JSON 对象/);
});

test('management and workflow discovery preserve the complete official tool schema', () => {
  const tool = {
    name: 'query',
    inputSchema: {
      type: 'object',
      properties: {
        options: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    },
  };
  assert.deepEqual(
    helpers.mcpTools({ tools: { servers: [{ tools: [tool] }] } }),
    [tool]
  );
  assert.deepEqual(helpers.mcpTools({ tools: [tool] }), [tool]);
  assert.equal(helpers.mcpResultFailed({ isError: true, content: [] }), true);
});

const githubTool = {
  method: 'get',
  endPoint: 'https://api.github.com/repos/iflytek/{repo}',
  schema: {
    openapi: '3.0.3',
    servers: [{ url: 'https://api.github.com' }],
    paths: {
      '/repos/iflytek/{repo}': {
        get: {
          operationId: 'getRepository',
          parameters: [
            {
              name: 'repo',
              in: 'path',
              required: true,
              schema: { type: 'string', default: 'astron-agent' },
            },
          ],
        },
      },
    },
  },
};

test('GitHub repository default prepares a usable path without adding a GET body', () => {
  const expected = { path: { repo: 'astron-agent' }, query: {}, header: {} };
  assert.deepEqual(JSON.parse(httpTestTemplate(githubTool).input), expected);
  assert.deepEqual(
    JSON.parse(
      httpTestTemplate({
        ...githubTool,
        schema: JSON.stringify(githubTool.schema),
      }).input
    ),
    expected
  );
});

test('management and workflow initialize HTTP inputs with the same adapter and submit edited JSON', () => {
  for (const path of [
    '../src/pages/resource-management/resource-tools/index.tsx',
    '../src/components/workflow/modal/add-plugin/index.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /import \{ httpTestTemplate \}/);
    assert.match(source, /httpTestTemplate\((?:row \|\| \{\}|item)\)/);
    assert.match(source, /parseArguments\((?:debugInput|input)\)/);
    assert.doesNotMatch(source, /"body": \{\}/);
  }
  // Initial templates are not merged back into a deliberately edited request.
  const template = httpTestTemplate(githubTool);
  assert.equal(JSON.parse(template.input).path.repo, 'astron-agent');
  for (const edited of [
    { path: { repo: 'another-repo' }, query: {} },
    { path: {}, body: {} },
    { path: {} },
  ]) {
    assert.deepEqual(helpers.parseArguments(JSON.stringify(edited)), edited);
  }
});

test('saved operation, local references, parameter overrides and nested falsy defaults agree', () => {
  const schema = {
    servers: [{ url: 'https://example.com/base/' }],
    paths: {
      '/unused': {
        get: {
          parameters: [{ name: 'wrong', in: 'query', schema: { default: 1 } }],
        },
      },
      '/records/{id}': {
        parameters: [
          { $ref: '#/components/parameters/Id' },
          { name: 'limit', in: 'query', schema: { default: 10 } },
        ],
        get: {
          parameters: [
            { name: 'wrongMethod', in: 'query', schema: { default: true } },
          ],
        },
        post: {
          parameters: [
            { name: 'limit', in: 'query', schema: { default: 0 } },
            { name: 'enabled', in: 'query', schema: { default: false } },
            { name: 'empty', in: 'header', schema: { default: '' } },
            { name: 'limit', in: 'header', schema: { default: 25 } },
          ],
          requestBody: { $ref: '#/components/requestBodies/Record' },
        },
      },
    },
    components: {
      parameters: {
        Id: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { $ref: '#/components/schemas/id~1value~0' },
        },
      },
      requestBodies: {
        Record: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Record' },
            },
          },
        },
      },
      schemas: {
        'id/value~': { type: 'string', default: 'saved' },
        Record: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            options: {
              type: 'object',
              properties: {
                enabled: { default: false },
                count: { default: 0 },
                name: { default: '' },
              },
            },
            optional: { type: 'string' },
          },
        },
      },
    },
  };
  const template = httpTestTemplate({
    schema,
    method: 'POST',
    endPoint: 'https://example.com/base/records/{id}',
  });
  assert.deepEqual(JSON.parse(template.input), {
    path: { id: 'saved' },
    query: { limit: 0, enabled: false },
    header: { empty: '', limit: 25 },
    body: { options: { enabled: false, count: 0, name: '' } },
  });
  assert.match(template.hint, /body.title/);
  assert.doesNotMatch(template.hint, /optional/);
});

test('required values without defaults are named, masked auth and cyclic refs are not copied', () => {
  const template = httpTestTemplate({
    schema: {
      servers: [{ url: 'https://example.com' }],
      paths: {
        '/{repo}': {
          get: {
            parameters: [
              {
                name: 'repo',
                in: 'path',
                required: true,
                schema: { type: 'string', example: 'example-only' },
              },
              {
                name: 'count',
                in: 'query',
                required: true,
                schema: { type: 'integer' },
              },
              {
                name: 'authorization',
                in: 'header',
                schema: { default: '******' },
              },
              {
                name: 'recursive',
                in: 'query',
                schema: { $ref: '#/components/schemas/Cycle' },
              },
            ],
          },
        },
      },
      components: {
        securitySchemes: {
          token: {
            type: 'apiKey',
            name: 'token',
            in: 'query',
            'x-value': '******',
          },
        },
        schemas: {
          Cycle: {
            type: 'object',
            properties: { next: { $ref: '#/components/schemas/Cycle' } },
          },
        },
      },
    },
  });
  assert.deepEqual(JSON.parse(template.input), {
    path: {},
    query: {},
    header: {},
  });
  assert.match(template.hint, /path.repo/);
  assert.match(template.hint, /query.count/);
  assert.doesNotMatch(template.input, /example-only|\*\*\*\*\*\*|token/);
});

test('required empty containers are submitted while absent optional containers remain omitted', () => {
  for (const field of [
    { type: 'object', properties: {} },
    { type: 'object', properties: { optional: { type: 'string' } } },
    { type: 'array', items: { type: 'string' } },
  ]) {
    for (const required of [true, false]) {
      const tool = {
        schema: {
          servers: [{ url: 'https://example.com' }],
          paths: {
            '/run': {
              post: {
                requestBody: {
                  required,
                  content: { 'application/json': { schema: field } },
                },
              },
            },
          },
        },
      };
      const input = JSON.parse(httpTestTemplate(tool).input);
      if (required)
        assert.deepEqual(input.body, field.type === 'array' ? [] : {});
      else assert.equal('body' in input, false);
    }
  }
});

test('required children cannot activate absent optional HTTP parent containers', () => {
  for (const nested of [
    { type: 'object', properties: {} },
    { type: 'array', items: { type: 'string' } },
  ]) {
    const parent = {
      type: 'object',
      required: ['nested'],
      properties: { nested },
    };
    const tool = {
      schema: {
        servers: [{ url: 'https://example.com' }],
        paths: {
          '/run': {
            post: {
              parameters: [{ name: 'options', in: 'query', schema: parent }],
              requestBody: {
                required: false,
                content: { 'application/json': { schema: parent } },
              },
            },
          },
        },
      },
    };
    assert.deepEqual(JSON.parse(httpTestTemplate(tool).input), {
      path: {},
      query: {},
      header: {},
    });
    parent.properties.flag = { type: 'boolean', default: false };
    const withDefault = JSON.parse(httpTestTemplate(tool).input);
    const activated = {
      nested: nested.type === 'array' ? [] : {},
      flag: false,
    };
    assert.deepEqual(withDefault.body, activated);
    assert.deepEqual(withDefault.query.options, activated);
  }
});
