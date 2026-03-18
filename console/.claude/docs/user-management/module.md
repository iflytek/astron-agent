# User Management 模块文档

## 1. 模块概述

User Management（用户管理）模块负责管理用户的基本信息、个人 Bot 管理、用户协议等功能。该模块是用户在系统中的基础身份管理模块，提供用户信息的查询和更新功能。

### 核心功能
- **用户信息管理**：查询和更新用户基本信息（昵称、头像）
- **个人 Bot 管理**：查询、删除用户创建的 Bot
- **用户协议**：用户同意用户协议

### 用户状态
- **0 - 未激活**：用户注册但未激活
- **1 - 激活**：正常用户
- **2 - 冻结**：被冻结的用户

## 2. 后端 API

### 2.1 UserInfoController (`/user-info`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/user-info/me | UserInfoController | 无 | 获取当前用户信息 |
| POST | /api/user-info/update | UserInfoController | 无 | 更新当前用户基本信息（昵称、头像） |
| POST | /api/user-info/agreement | UserInfoController | 无 | 当前用户同意用户协议 |

### 2.2 MyBotController (`/my-bot`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/my-bot/list | MyBotController | @SpacePreAuth | 用户创建的助手列表（分页） |
| POST | /api/my-bot/delete | MyBotController | @SpacePreAuth | 删除用户创建的助手 |
| POST | /api/my-bot/bot-detail | MyBotController | @SpacePreAuth | 获取 Bot 详情信息 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| user_info | UserInfo | 用户信息表 |

### 关键字段

#### UserInfo（用户信息表）
```java
@Data
public class UserInfo {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String uid;                 // 用户 ID
    private String username;            // 用户名
    private String avatar;              // 头像
    private String nickname;            // 昵称
    private String mobile;              // 手机号
    private Integer accountStatus;      // 账户状态：0-未激活，1-激活，2-冻结
    private EnterpriseServiceTypeEnum enterpriseServiceType; // 用户空间类型
    private Integer userAgreement;      // 用户协议同意：0-未同意，1-已同意
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    @TableLogic
    private Integer deleted;            // 逻辑删除标志：0-未删除，1-已删除
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| UserInfoController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/user/UserInfoController.java | 用户信息管理控制器 |
| MyBotController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/user/MyBotController.java | 个人 Bot 管理控制器 |
| UserInfoDataService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/data/UserInfoDataService.java | 用户信息数据服务 |
| UserBotService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/user/UserBotService.java | 用户 Bot 业务逻辑 |

### 关键业务逻辑

#### 获取当前用户信息
1. 从请求上下文中获取当前用户 UID
2. 查询 `user_info` 表获取用户信息
3. 返回用户信息

#### 更新用户基本信息
1. 从请求上下文中获取当前用户 UID
2. 验证昵称和头像参数（至少一个不为空）
3. 更新 `user_info` 表
4. 返回更新后的用户信息

#### 同意用户协议
1. 从请求上下文中获取当前用户 UID
2. 更新 `user_info` 表的 `userAgreement` 字段为 1
3. 返回成功

#### 查询个人 Bot 列表
1. 从请求上下文中获取当前用户 UID 和空间 ID
2. 查询 `chat_bot_base` 表获取用户创建的 Bot
3. 支持分页和筛选（Bot 名称、类型）
4. 返回 Bot 列表

#### 删除个人 Bot
1. 从请求上下文中获取当前用户 UID
2. 验证 Bot 权限（只能删除自己创建的 Bot）
3. 软删除 `chat_bot_base` 表记录（`isDelete = 1`）
4. 删除相关的聊天记录、工作流等
5. 返回成功

#### 获取 Bot 详情
1. 从请求上下文中获取当前用户 UID
2. 验证 Bot 权限（只能查看自己创建的 Bot）
3. 查询 Bot 基本信息
4. 查询 Bot 关联的数据集（自有数据集 + MAAS 数据集）
5. 查询 Bot 模型信息
6. 查询 Bot 人格配置
7. 返回完整的 Bot 详情

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 个人中心 | /profile | console/frontend/src/pages/profile/index.tsx | 个人中心页面 |
| 我的 Bot | /my-bots | console/frontend/src/pages/my-bots/index.tsx | 我的 Bot 列表页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| UserProfile | console/frontend/src/components/user-profile/ | 用户信息展示和编辑组件 |
| MyBotList | console/frontend/src/components/my-bot-list/ | 我的 Bot 列表组件 |

## 6. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| getCurrentUserInfo | console/frontend/src/services/login.ts | GET /api/user-info/me |
| updateUserInfo | console/frontend/src/services/spark-common.ts | POST /api/user-info/update |
| getAgentList | console/frontend/src/services/agent.ts | POST /api/my-bot/list |
| deleteAgent | console/frontend/src/services/agent.ts | POST /api/my-bot/delete |

## 7. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、请求上下文）

### 被依赖的模块
- **space-management**：空间成员管理需要用户信息
- **enterprise-management**：企业成员管理需要用户信息
- **bot-management**：Bot 创建需要用户信息
- **chat**：聊天需要用户信息

## 8. 技术特性

### 8.1 请求上下文
- 使用 `RequestContextUtil` 获取当前用户 UID
- 自动从请求头或 Token 中解析用户信息

### 8.2 软删除
- 使用 `@TableLogic` 实现逻辑删除
- 删除的用户不会物理删除，可以恢复

### 8.3 账户状态管理
- 支持账户状态管理（未激活、激活、冻结）
- 冻结的用户无法登录和使用系统

### 8.4 用户协议
- 用户首次登录需要同意用户协议
- 未同意用户协议的用户无法使用系统

### 8.5 空间类型
- 用户有空间类型（Free、Pro、Team、Enterprise）
- 不同空间类型有不同的功能和限制

## 9. 注意事项

1. **权限校验**：个人 Bot 操作需要进行权限校验，只能操作自己创建的 Bot
2. **软删除**：用户和 Bot 使用逻辑删除（`deleted` 字段），不是物理删除
3. **账户状态**：冻结的用户无法登录和使用系统
4. **用户协议**：用户首次登录需要同意用户协议
5. **空间类型**：用户的空间类型决定了可用的功能和限制
6. **昵称和头像**：更新用户信息时，昵称和头像至少一个不为空
7. **Bot 详情**：获取 Bot 详情时会查询关联的数据集、模型、人格配置等信息
8. **删除 Bot**：删除 Bot 会同时删除相关的聊天记录、工作流等
9. **请求上下文**：所有用户操作都依赖请求上下文中的用户信息
10. **逻辑删除**：删除的用户和 Bot 不会物理删除，可以通过管理后台恢复