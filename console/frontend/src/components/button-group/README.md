# ButtonGroup 和 SpaceButton 组件使用说明

## 概述

ButtonGroup 和 SpaceButton 是一套基于权限控制的按钮组件，专为空间管理场景设计。它们提供了统一的权限验证、样式管理和交互处理功能。

## 组件结构

- **ButtonGroup**: 按钮组容器组件，支持多个按钮的统一管理
- **SpaceButton**: 单个按钮组件，内置权限控制和状态管理
- **类型定义**: 完整的 TypeScript 类型支持

## 导入方式

```typescript
// 导入按钮组（推荐）
import ButtonGroup from '@/components/space/ButtonGroup';

// 单独导入组件
import { SpaceButton } from '@/components/space/ButtonGroup';

// 导入类型定义
import type {
  ButtonConfig,
  UserRole,
  ButtonGroupProps,
  PermissionConfig,
} from '@/components/space/ButtonGroup';

// 导入权限枚举
import {
  SpaceType,
  RoleType,
  ModuleType,
  OperationType,
} from '@/components/space/ButtonGroup';
```

## 基础用法

### 1. 简单按钮组

```typescript
import React from 'react';
import ButtonGroup from '@/components/space/ButtonGroup';
import { EditOutlined, DeleteOutlined, ShareAltOutlined } from '@ant-design/icons';

const MyComponent = () => {
  const buttons = [
    {
      key: 'edit',
      text: '编辑',
      icon: <EditOutlined />,
      type: 'primary' as const
    },
    {
      key: 'share',
      text: '分享',
      icon: <ShareAltOutlined />,
      type: 'default' as const
    },
    {
      key: 'delete',
      text: '删除',
      icon: <DeleteOutlined />,
      type: 'default' as const,
      danger: true
    }
  ];

  const handleButtonClick = (buttonKey: string, event: React.MouseEvent) => {
    console.log('按钮点击:', buttonKey);
  };

  return (
    <ButtonGroup
      buttons={buttons}
      onButtonClick={handleButtonClick}
    />
  );
};
```

### 2. 带权限控制的按钮组

```typescript
import React from 'react';
import ButtonGroup from '@/components/space/ButtonGroup';
import { ModuleType, OperationType, SpaceType, RoleType } from '@/components/space/ButtonGroup';
import type { ButtonConfig, UserRole } from '@/components/space/ButtonGroup';

const PermissionButtonGroup = () => {
  // 用户角色信息（也可以不传，组件会自动从 userStore 获取）
  const userRole: UserRole = {
    spaceType: SpaceType.ENTERPRISE,
    roleType: RoleType.ADMIN
  };

  const buttons: ButtonConfig[] = [
    {
      key: 'edit',
      text: '编辑',
      icon: <EditOutlined />,
      type: 'primary',
      permission: {
        module: ModuleType.AGENT_MANAGEMENT,
        operation: OperationType.UPDATE
      }
    },
    {
      key: 'delete',
      text: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      permission: {
        module: ModuleType.AGENT_MANAGEMENT,
        operation: OperationType.DELETE,
        resourceOwnerId: 'owner123',
        currentUserId: 'user456'
      }
    },
    {
      key: 'advanced',
      text: '高级功能',
      permission: {
        customCheck: (userRole) => userRole.roleType === RoleType.SUPER_ADMIN
      }
    }
  ];

  return (
    <ButtonGroup
      buttons={buttons}
      userRole={userRole}
      onButtonClick={(key) => console.log('点击了:', key)}
    />
  );
};
```

### 3. 单独使用 SpaceButton

```typescript
import React from 'react';
import { SpaceButton } from '@/components/space/ButtonGroup';
import { PlusOutlined } from '@ant-design/icons';

const SingleButton = () => {
  const buttonConfig = {
    key: 'create',
    text: '创建',
    icon: <PlusOutlined />,
    type: 'primary' as const,
    tooltip: '创建新的资源'
  };

  return (
    <SpaceButton
      config={buttonConfig}
      onClick={(key) => console.log('创建操作')}
    />
  );
};
```

## API 文档

### ButtonGroup Props

| 属性          | 类型                                             | 默认值     | 说明                                      |
| ------------- | ------------------------------------------------ | ---------- | ----------------------------------------- |
| buttons       | `ButtonConfig[]`                                 | -          | 按钮配置数组                              |
| userRole      | `UserRole?`                                      | -          | 用户角色信息，不传时自动从 userStore 获取 |
| className     | `string?`                                        | -          | 自定义样式类名                            |
| size          | `'large' \| 'middle' \| 'small'`                 | `'middle'` | 按钮大小                                  |
| onButtonClick | `(key: string, event: React.MouseEvent) => void` | -          | 统一的按钮点击处理函数                    |
| style         | `React.CSSProperties?`                           | -          | 自定义样式                                |
| vertical      | `boolean`                                        | `false`    | 是否垂直排列                              |
| split         | `boolean`                                        | `true`     | 是否显示分割线                            |

### SpaceButton Props

| 属性      | 类型                                             | 默认值  | 说明                                      |
| --------- | ------------------------------------------------ | ------- | ----------------------------------------- |
| config    | `ButtonConfig`                                   | -       | 按钮配置                                  |
| userRole  | `UserRole?`                                      | -       | 用户角色信息，不传时自动从 userStore 获取 |
| className | `string?`                                        | -       | 自定义样式类名                            |
| style     | `React.CSSProperties?`                           | -       | 自定义样式                                |
| size      | `'large' \| 'middle' \| 'small'`                 | -       | 按钮大小                                  |
| onClick   | `(key: string, event: React.MouseEvent) => void` | -       | 点击事件处理函数                          |
| inGroup   | `boolean`                                        | `false` | 是否在按钮组中                            |

### ButtonConfig 配置

| 属性       | 类型                                                     | 默认值      | 说明             |
| ---------- | -------------------------------------------------------- | ----------- | ---------------- |
| key        | `string`                                                 | -           | 按钮唯一标识符   |
| text       | `string`                                                 | -           | 按钮文本         |
| icon       | `React.ReactNode?`                                       | -           | 按钮图标         |
| type       | `'primary' \| 'default' \| 'dashed' \| 'link' \| 'text'` | `'default'` | 按钮类型         |
| size       | `'large' \| 'middle' \| 'small'`                         | -           | 按钮大小         |
| disabled   | `boolean`                                                | `false`     | 是否禁用         |
| tooltip    | `string?`                                                | -           | 提示文本         |
| danger     | `boolean`                                                | `false`     | 是否为危险按钮   |
| loading    | `boolean`                                                | `false`     | 是否显示加载状态 |
| onClick    | `(key: string, event: React.MouseEvent) => void`         | -           | 按钮点击处理函数 |
| permission | `PermissionConfig?`                                      | -           | 权限配置         |
| visible    | `boolean \| ((userRole: UserRole) => boolean)`           | `true`      | 显示条件         |

### PermissionConfig 权限配置

| 属性            | 类型                              | 说明               |
| --------------- | --------------------------------- | ------------------ |
| module          | `ModuleType?`                     | 模块类型           |
| operation       | `OperationType?`                  | 操作类型           |
| resourceOwnerId | `string?`                         | 资源所有者ID       |
| currentUserId   | `string?`                         | 当前用户ID         |
| customCheck     | `(userRole: UserRole) => boolean` | 自定义权限检查函数 |

### UserRole 用户角色

| 属性      | 类型        | 说明     |
| --------- | ----------- | -------- |
| spaceType | `SpaceType` | 空间类型 |
| roleType  | `RoleType`  | 角色类型 |

## 权限控制说明

### 1. 权限失败行为配置

组件支持配置权限检查失败时的行为：

#### **行为类型**

- `PermissionFailureBehavior.HIDE`：隐藏按钮（默认行为）
- `PermissionFailureBehavior.DISABLE`：禁用按钮但仍显示

#### **配置方式**

**按钮级别配置**：

```typescript
{
  key: 'share',
  text: '分享',
  permission: {
    module: ModuleType.SPACE,
    operation: OperationType.VIEW,
    failureBehavior: PermissionFailureBehavior.DISABLE // 单独配置此按钮的行为
  }
}
```

**全局配置**：

```typescript
<ButtonGroup
  buttons={buttons}
  defaultPermissionFailureBehavior={PermissionFailureBehavior.DISABLE} // 全局默认行为
/>
```

**优先级**：按钮级别配置 > 全局默认配置 > 系统默认（HIDE）

### 2. 自动权限获取

组件支持两种方式获取用户权限：

- **属性传入**: 通过 `userRole` 属性显式传入
- **自动获取**: 不传 `userRole` 时，组件会自动从 `userStore` 获取

```typescript
// 方式1: 显式传入
<ButtonGroup userRole={userRole} buttons={buttons} />

// 方式2: 自动获取（推荐）
<ButtonGroup buttons={buttons} />
```

### 2. 权限检查层级

1. **模块权限**: 检查用户是否有该模块的操作权限
2. **资源权限**: 检查用户是否有操作特定资源的权限
3. **自定义权限**: 通过自定义函数进行复杂权限判断

### 3. 权限配置示例

```typescript
import { PermissionFailureBehavior } from '@/components/ButtonGroup';

const buttons = [
  {
    key: 'edit',
    text: '编辑',
    // 基础模块权限 - 无权限时隐藏（默认行为）
    permission: {
      module: ModuleType.AGENT_MANAGEMENT,
      operation: OperationType.EDIT,
    },
  },
  {
    key: 'share',
    text: '分享',
    // 无权限时禁用而不是隐藏
    permission: {
      module: ModuleType.AGENT_MANAGEMENT,
      operation: OperationType.VIEW,
      failureBehavior: PermissionFailureBehavior.DISABLE,
    },
  },
  {
    key: 'delete',
    text: '删除',
    // 资源权限 + 所有者检查 - 无权限时隐藏
    permission: {
      module: ModuleType.AGENT_MANAGEMENT,
      operation: OperationType.DELETE,
      resourceOwnerId: agent.ownerId,
      currentUserId: currentUser.id,
      failureBehavior: PermissionFailureBehavior.HIDE,
    },
  },
  {
    key: 'superAdmin',
    text: '超级管理',
    // 自定义权限检查 - 无权限时禁用
    permission: {
      customCheck: userRole => userRole.roleType === RoleType.SUPER_ADMIN,
      failureBehavior: PermissionFailureBehavior.DISABLE,
    },
  },
];
```

## 样式定制

### 1. 自定义样式

```typescript
// 通过 className
<ButtonGroup
  className="my-button-group"
  buttons={buttons}
/>

// 通过 style 属性
<ButtonGroup
  style={{ marginTop: 16 }}
  buttons={buttons}
/>
```

### 2. 全局样式覆盖

```scss
// 在你的样式文件中
.my-button-group {
  .ant-btn {
    border-radius: 8px;
    margin: 0 4px;
  }
}
```

## 最佳实践

### 1. 权限配置建议

```typescript
// ✅ 推荐：清晰的权限配置
const buttons = [
  {
    key: 'edit',
    text: '编辑',
    permission: {
      module: ModuleType.AGENT_MANAGEMENT,
      operation: OperationType.UPDATE,
    },
  },
];

// ❌ 不推荐：混合权限逻辑
const buttons = [
  {
    key: 'edit',
    text: '编辑',
    visible: userRole => {
      // 复杂的权限逻辑应该放在 permission.customCheck 中
      return userRole.roleType === RoleType.ADMIN && hasOtherPermission();
    },
  },
];
```

### 2. 性能优化

```typescript
// ✅ 推荐：将按钮配置提取到组件外部
const BUTTON_CONFIGS = [
  { key: 'edit', text: '编辑', icon: <EditOutlined /> },
  { key: 'delete', text: '删除', icon: <DeleteOutlined /> }
];

const MyComponent = () => {
  return <ButtonGroup buttons={BUTTON_CONFIGS} />;
};

// ❌ 不推荐：每次渲染都创建新的配置
const MyComponent = () => {
  const buttons = [
    { key: 'edit', text: '编辑', icon: <EditOutlined /> }
  ];
  return <ButtonGroup buttons={buttons} />;
};
```

### 3. 错误处理

```typescript
const MyComponent = () => {
  const handleButtonClick = (key: string, event: React.MouseEvent) => {
    try {
      switch (key) {
        case 'delete':
          handleDelete();
          break;
        case 'edit':
          handleEdit();
          break;
        default:
          console.warn(`未知的按钮操作: ${key}`);
      }
    } catch (error) {
      console.error('按钮操作失败:', error);
      // 显示错误提示
    }
  };

  return (
    <ButtonGroup
      buttons={buttons}
      onButtonClick={handleButtonClick}
    />
  );
};
```

## 常见问题

### Q: 为什么我的按钮没有显示？

A: 检查以下几点：

1. 用户是否有相应的权限
2. `visible` 配置是否正确
3. `userRole` 是否正确传入或从 userStore 获取

### Q: 如何自定义按钮样式？

A: 可以通过以下方式：

1. 使用 `className` 属性添加自定义样式类
2. 使用 `style` 属性直接设置样式
3. 修改对应的 SCSS 模块文件

### Q: 权限检查失败时会发生什么？

A: 权限检查失败的按钮会返回 `null`，不会在界面上显示。如果所有按钮都没有权限，整个按钮组也会返回 `null`。

## 更新日志

- **v1.0.0**: 初始版本，支持基础按钮组功能和权限控制
- **v1.1.0**: 新增自动从 userStore 获取用户角色功能
- **v1.1.1**: 优化权限检查逻辑，提升性能
