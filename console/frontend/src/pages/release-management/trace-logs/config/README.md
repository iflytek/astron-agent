# TraceLogs Config 配置说明

## 文件结构

```
config/
├── index.ts      # 统一入口文件，导出所有配置、工具函数和类型
├── type.d.ts     # 类型定义文件
├── utils.ts      # 工具函数文件
└── README.md     # 说明文档
```

## 文件作用

### `index.ts` - 统一入口

- **常量定义**: `SEPERATOR`、`timeRangeMap` 等
- **表格配置**: `columnsMap`、`requiredOptions`、`checkboxOptions`
- **工具函数封装**: 对 utils 中的函数进行封装，预设参数
- **统一导出**: 导出所有配置、工具函数和类型定义

### `type.d.ts` - 类型定义

- `DataType`: 表格数据行的类型定义
- 其他相关接口类型

### `utils.ts` - 工具函数

- **数据处理**: `isValidJson`、`durationToSeconds`、`transformTraceData`、`convertToTree`
- **时间处理**: `searchValueFormat`、`convertSearchValueToRange`、`createDateRangeValidator`
- **参数生成**: `generateListParams`

## 使用方式

### 推荐用法（统一入口）

```typescript
// 导入所有需要的配置和工具函数
import {
  SEPERATOR,
  timeRangeMap,
  columnsMap,
  searchValueFormat,
  isValidJson,
  convertToTree,
  type DataType,
} from './config';
```

### 按需导入（如果需要）

```typescript
// 只导入工具函数
import { isValidJson, convertToTree } from './config/utils';

// 只导入类型
import type { DataType } from './config/type';
```

## 优势

1. **统一管理**: 所有配置集中在一个入口文件
2. **清晰分类**: 按功能分为常量、配置、工具函数
3. **类型安全**: 统一导出类型定义
4. **易于维护**: 修改配置只需在一个地方
5. **简化导入**: 减少导入语句的复杂性
