# Skill: 前端技术设计

为前端开发生成详细的技术设计文档，包含组件树、状态管理、API 集成、国际化方案，可直接指导 Claude 编写代码。

## 前置条件

读取以下文档：
- `console/.claude/docs/{feature-name}/spec.md`（必须）
- `console/.claude/docs/{feature-name}/tasks.md`（必须）

同时读取现有前端代码，参考 `console/frontend/CLAUDE.md` 中的架构规范。

## 执行步骤

1. 读取规格说明和任务规划
2. 分析现有前端代码模式：
   - 页面组件: `console/frontend/src/pages/`
   - 路由配置: `console/frontend/src/router/`
   - API 服务: `console/frontend/src/services/`
   - 状态管理: `console/frontend/src/store/`
   - 公共组件: `console/frontend/src/components/`
   - 类型定义: `console/frontend/src/types/`
   - 国际化: `console/frontend/src/locales/`
   - 工具函数: `console/frontend/src/utils/`
3. 找到相似功能的现有页面作为参考（读取具体代码）
4. 设计组件树和页面结构
5. 设计状态管理方案
6. 设计 API 集成层
7. 规划国际化文案
8. 生成 `frontend-design.md`

## 输出文件

`console/.claude/docs/{feature-name}/frontend-design.md`

## 输出模板

```markdown
---
feature: {功能名称}
created: {YYYY-MM-DD}
upstream: spec.md, tasks.md
reference: {参考的现有相似页面路径}
---

# {功能名称} — 前端技术设计

## 1. 设计概述

{一段话说明前端技术方案}

**参考实现**: `{现有相似页面的代码路径}`（本设计参考其模式）

## 2. 路由设计

**修改文件**: `console/frontend/src/router/index.tsx`

| 路由路径 | 组件 | 懒加载 | 说明 |
|----------|------|--------|------|
| `/{path}` | `{PageComponent}` | 是 | {说明} |

**路由代码**:
```tsx
{
  path: '/{path}',
  element: <LazyLoad component={lazy(() => import('@/pages/{module}/{Page}'))} />,
}
```

## 3. 组件树

```
{PageComponent}/
├── index.tsx                    # 页面入口
├── components/
│   ├── {SubComponent1}.tsx      # {职责}
│   ├── {SubComponent2}.tsx      # {职责}
│   └── {SubComponent3}.tsx      # {职责}
├── hooks/
│   └── use{Feature}.ts          # {职责}
└── styles/
    └── index.module.scss        # 页面样式
```

## 4. 新增文件清单

| 文件路径 | 类型 | 职责 |
|----------|------|------|
| `src/pages/{module}/{Page}/index.tsx` | 页面组件 | {一句话} |
| `src/pages/{module}/{Page}/components/{Sub}.tsx` | 业务组件 | {一句话} |
| `src/services/{service}.ts` | API 服务 | {一句话} |
| `src/types/{types}.ts` | 类型定义 | {一句话} |

## 5. 状态管理

**方案选择**: Zustand / Recoil / 本地 state（选择理由: {理由}）

### Store 定义（如使用 Zustand）

```typescript
interface {Feature}State {
  // 状态字段
  list: {Item}[];
  loading: boolean;
  // 操作方法
  fetchList: (params: {Params}) => Promise<void>;
  create: (data: {CreateDTO}) => Promise<void>;
}

export const use{Feature}Store = create<{Feature}State>((set, get) => ({
  list: [],
  loading: false,
  fetchList: async (params) => {
    set({ loading: true });
    const data = await {apiFunction}(params);
    set({ list: data, loading: false });
  },
  create: async (data) => {
    await {apiFunction}(data);
    get().fetchList({});
  },
}));
```

### 本地状态（如使用 useState）

```typescript
// 在页面组件中
const [data, setData] = useState<{Type}[]>([]);
const [loading, setLoading] = useState(false);
const [modalVisible, setModalVisible] = useState(false);
```

## 6. API Service 层

**文件**: `console/frontend/src/services/{service}.ts`

```typescript
import request from './request';

// {接口说明}
export function {functionName}(params: {RequestType}): Promise<{ResponseType}> {
  return request.post('/{api-path}', params);
}

// {接口说明}
export function {functionName}(id: string): Promise<{ResponseType}> {
  return request.get(`/{api-path}/${id}`);
}
```

**类型定义**: `console/frontend/src/types/{types}.ts`

```typescript
export interface {TypeName} {
  id: string;
  // 字段定义
}

export interface {RequestType} {
  // 请求参数
}

export interface {ResponseType} {
  // 响应数据
}
```

## 7. 国际化

**修改文件**:
- `console/frontend/src/locales/zh/{module}.json`
- `console/frontend/src/locales/en/{module}.json`

| i18n Key | 中文 | English |
|----------|------|---------|
| `{module}.{key1}` | {中文文案} | {English text} |
| `{module}.{key2}` | {中文文案} | {English text} |

## 8. 需要修改的现有文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/router/index.tsx` | 添加路由 |
| `src/locales/zh/{file}.json` | 添加中文文案 |
| `src/locales/en/{file}.json` | 添加英文文案 |

## 9. 关键交互细节

| 交互场景 | 触发条件 | 行为 | Ant Design 组件 |
|----------|----------|------|-----------------|
| {场景1} | {条件} | {行为} | {组件} |
| {场景2} | {条件} | {行为} | {组件} |

## 10. 可复用的现有代码

| 现有代码 | 路径 | 复用方式 |
|----------|------|----------|
| {组件/Hook/工具} | `{文件路径}` | {如何复用} |
```

## 约束（必须遵循项目现有规范）

- 组件库: Ant Design 5，不引入其他 UI 库
- 样式: CSS Modules (.module.scss) 或 Sass，遵循现有页面模式
- 状态管理: 全局状态用 Zustand，局部状态用 useState/useReducer
- API 调用: 使用项目现有的 Axios 封装（`src/services/request.ts`）
- 路由: React Router v6 懒加载模式
- 类型: 严格 TypeScript，不使用 any（warn 级别也要避免）
- 国际化: 所有用户可见文本必须使用 `useTranslation` + i18n key
- 路径别名: 使用 `@/` 代替 `src/`
- 必须找到现有相似页面作为参考，保持风格一致
- 中文为主，代码保留英文
