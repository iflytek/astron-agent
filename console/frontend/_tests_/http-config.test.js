import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(
  new URL(
    '../src/pages/resource-management/resource-tools/http-config.ts',
    import.meta.url
  ),
  'utf8'
);
const module = { exports: {} };
new Function(
  'module',
  'exports',
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
)(module, module.exports);
const {
  configOperations,
  updateOperation,
  moveOperation,
  updateServer,
  updateFieldSchema,
  updateBodyProperty,
  removeBodyProperty,
  renameRequestParameter,
  newRequestParameter,
} = module.exports;
const fixture = () => ({
  openapi: '3.0.3',
  info: { title: 'Existing', version: '1', 'x-owned': 'retained' },
  servers: [
    { url: 'https://old.example', description: 'keep' },
    { url: 'https://backup.example' },
  ],
  paths: {
    '/items/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      get: {
        operationId: 'read',
        responses: {
          200: {
            description: 'keep',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Reply' },
              },
            },
          },
        },
        'x-custom': true,
      },
      post: { operationId: 'write' },
    },
  },
  components: {
    schemas: { Reply: { type: 'object' } },
    securitySchemes: {
      secret: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        'x-value': '******',
      },
    },
  },
});
test('configuration field edits preserve response schemas, extensions, other operations and masked credentials', () => {
  const doc = fixture();
  const read = configOperations(doc)[0];
  const next = updateOperation(updateServer(doc, 'https://new.example'), read, {
    operationId: 'lookup',
  });
  assert.equal(next.servers[0].url, 'https://new.example');
  assert.equal(next.servers[0].description, 'keep');
  assert.deepEqual(next.servers[1], doc.servers[1]);
  assert.deepEqual(
    next.paths['/items/{id}'].post,
    doc.paths['/items/{id}'].post
  );
  assert.deepEqual(
    next.paths['/items/{id}'].get.responses,
    read.operation.responses
  );
  assert.equal(next.paths['/items/{id}'].get['x-custom'], true);
  assert.deepEqual(next.components, doc.components);
  assert.equal(doc.paths['/items/{id}'].get.operationId, 'read');
});
test('moving an operation preserves sibling methods and inherited parameters and rejects collisions', () => {
  const doc = fixture();
  const read = configOperations(doc)[0];
  assert.throws(() => moveOperation(doc, read, read.path, 'post'), /已存在/);
  const moved = moveOperation(doc, read, '/records/{id}', 'get');
  assert.equal(moved.paths['/records/{id}'].get.operationId, 'read');
  assert.deepEqual(
    moved.paths['/records/{id}'].get.parameters,
    doc.paths['/items/{id}'].parameters
  );
  assert.equal(moved.paths['/items/{id}'].post.operationId, 'write');
  assert.deepEqual(moved.components, doc.components);
});
test('body form rename edits only the target property and keeps required names and unknown media metadata', () => {
  let doc = fixture();
  let op = configOperations(doc)[1];
  doc = updateOperation(doc, op, {
    requestBody: {
      required: true,
      'x-body': 'keep',
      content: {
        'application/json': {
          example: { title: 'Example' },
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'other'],
            properties: {
              title: { type: 'string', minLength: 2 },
              other: { type: 'boolean', default: false },
            },
          },
        },
        'text/plain': { schema: { type: 'string' } },
      },
    },
  });
  op = configOperations(doc)[1];
  const next = updateBodyProperty(
    doc,
    op,
    'title',
    'label',
    { type: 'string', minLength: 2, default: 'Hi' },
    true
  );
  const body = next.paths['/items/{id}'].post.requestBody;
  assert.deepEqual(body.content['application/json'].schema.required, [
    'other',
    'label',
  ]);
  assert.equal(
    body.content['application/json'].schema.additionalProperties,
    false
  );
  assert.equal(body['x-body'], 'keep');
  assert.deepEqual(body.content['text/plain'], { schema: { type: 'string' } });
  assert.deepEqual(body.content['application/json'].schema.properties.other, {
    type: 'boolean',
    default: false,
  });
  assert.throws(
    () => updateBodyProperty(doc, op, 'title', 'other', {}, false),
    /已存在/
  );
  const removed = removeBodyProperty(next, configOperations(next)[1], 'label');
  assert.deepEqual(
    removed.paths['/items/{id}'].post.requestBody.content['application/json']
      .schema.required,
    ['other']
  );
});
test('default fields retain false and zero with type validation instead of converting them to strings', () => {
  assert.deepEqual(updateFieldSchema({ type: 'boolean' }, 'default', 'false'), {
    type: 'boolean',
    default: false,
  });
  assert.deepEqual(updateFieldSchema({ type: 'integer' }, 'default', '0'), {
    type: 'integer',
    default: 0,
  });
  assert.throws(() => updateFieldSchema({ type: 'integer' }, 'default', '1.2'));
  assert.throws(() => updateFieldSchema({ type: 'boolean' }, 'default', '1'));
  assert.equal(
    updateFieldSchema({ type: 'string', default: 'x' }, 'default', '').default,
    undefined
  );
  assert.deepEqual(
    updateFieldSchema(
      { type: 'string', default: 'x', enum: ['x'] },
      'type',
      'array'
    ),
    { type: 'array', items: { type: 'string' } }
  );
});

test('ordinary parameter names follow URL placeholders while preserving schema and required choices', () => {
  const parameter = {
    name: 'old',
    in: 'query',
    required: false,
    schema: { type: 'integer', default: 0 },
    'x-owned': true,
  };
  assert.deepEqual(renameRequestParameter('/items/{id}', parameter, 'id'), {
    ...parameter,
    name: 'id',
    in: 'path',
    required: true,
  });
  assert.deepEqual(
    renameRequestParameter(
      '/items/{id}',
      { ...parameter, in: 'path', required: true },
      'limit'
    ),
    {
      ...parameter,
      name: 'limit',
      in: 'query',
      required: true,
    }
  );
  assert.deepEqual(
    renameRequestParameter('/items/{id}', parameter, 'idSuffix'),
    {
      ...parameter,
      name: 'idSuffix',
      in: 'query',
      required: false,
    }
  );
  assert.equal(parameter.name, 'old');
  assert.deepEqual(renameRequestParameter('/items/{id}', {}, 'search'), {
    name: 'search',
    in: 'query',
    required: false,
  });
});

test('renaming imported header and cookie parameters never moves their wire bindings', () => {
  for (const location of ['header', 'cookie']) {
    const parameter = {
      name: 'token',
      in: location,
      required: false,
      schema: { type: 'string' },
    };
    assert.deepEqual(renameRequestParameter('/items/{id}', parameter, 'id'), {
      ...parameter,
      name: 'id',
    });
  }
});

test('new parameters fill missing URL placeholders in order and skip inherited and local definitions', () => {
  const doc = fixture();
  doc.paths['/items/{id}'].get.parameters = [
    { name: 'parameter1', in: 'query', schema: { type: 'string' } },
  ];
  const before = JSON.stringify(doc);
  assert.deepEqual(newRequestParameter(doc, configOperations(doc)[0]), {
    name: 'parameter2',
    in: 'query',
    required: false,
    schema: { type: 'string' },
  });
  assert.equal(JSON.stringify(doc), before);
  doc.paths['/teams/{team}/items/{id}'] = {
    parameters: [
      { name: 'team', in: 'path', required: true, schema: { type: 'string' } },
    ],
    get: {
      parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
    },
  };
  const op = configOperations(doc).find(item => item.path.startsWith('/teams'));
  const added = newRequestParameter(doc, op);
  assert.deepEqual(added, {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string' },
  });
  const next = updateOperation(doc, op, {
    parameters: [...op.operation.parameters, added],
  });
  assert.equal(
    newRequestParameter(
      next,
      configOperations(next).find(item => item.path === op.path)
    ).in,
    'query'
  );
});

test('new parameter discovery reads local parameter references without rewriting shared definitions', () => {
  const doc = fixture();
  doc.components.parameters = {
    'Item/Id': {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    cursor: { name: 'parameter1', in: 'query', schema: { type: 'integer' } },
  };
  doc.paths['/items/{id}'].parameters = [
    { $ref: '#/components/parameters/Item~1Id' },
  ];
  doc.paths['/items/{id}'].get.parameters = [
    { $ref: '#/components/parameters/cursor' },
  ];
  const before = JSON.stringify(doc);
  assert.equal(
    newRequestParameter(doc, configOperations(doc)[0]).name,
    'parameter2'
  );
  assert.equal(JSON.stringify(doc), before);
});

test('nested properties rename and removal preserve constraints and required references', () => {
  const { updateSchemaProperty, removeSchemaProperty } = module.exports;
  const original = {
    type: 'object',
    additionalProperties: false,
    'x-meta': 'keep',
    required: ['title'],
    properties: {
      title: { type: 'string', default: '' },
      rows: {
        type: 'array',
        items: { type: 'object', properties: { count: { type: 'integer' } } },
      },
    },
  };
  const renamed = updateSchemaProperty(
    original,
    'title',
    'name',
    { type: 'string', default: 'ok' },
    true
  );
  assert.deepEqual(renamed.required, ['name']);
  assert.equal(renamed.additionalProperties, false);
  assert.equal(renamed['x-meta'], 'keep');
  assert.deepEqual(renamed.properties.rows, original.properties.rows);
  assert.throws(
    () => updateSchemaProperty(renamed, 'name', 'rows', {}, true),
    /已存在/
  );
  assert.throws(
    () => updateSchemaProperty(renamed, 'name', '', {}, true),
    /不能为空/
  );
  assert.deepEqual(removeSchemaProperty(renamed, 'name').required, []);
  assert.deepEqual(original.required, ['title']);
});
