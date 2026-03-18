# Enterprise Management 模块文档

## 1. 模块概述

Enterprise Management（企业管理）模块负责管理企业团队的创建、编辑、成员管理、邀请管理等功能。企业团队是比空间更高一级的组织单元，一个企业可以包含多个空间，用于实现企业级的资源管理和权限控制。

### 核心功能
- **企业团队管理**：创建、编辑企业团队信息（名称、Logo、头像）
- **成员管理**：添加、移除、修改成员角色
- **邀请管理**：邀请用户加入企业团队、撤回邀请、接受/拒绝邀请
- **权限控制**：基于角色的权限控制（Super Admin、Admin、Member）
- **套餐管理**：团队版和企业版套餐管理

### 企业类型
1. **团队版**（Team）：小型团队使用，功能和成员数量有限制
2. **企业版**（Enterprise）：大型企业使用，功能和成员数量更多

### 角色体系
- **Super Admin（超级管理员）**：企业创建者，拥有最高权限
- **Admin（管理员）**：可以管理企业成员和空间
- **Member（成员）**：普通成员，可以使用企业资源

## 2. 后端 API

### 2.1 EnterpriseController (`/enterprise`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/enterprise/visit-enterprise | EnterpriseController | 无 | 访问企业团队（记录访问历史） |
| GET | /api/enterprise/check-need-create-team | EnterpriseController | 无 | 检查是否需要创建团队（0-不需要，1-需要创建团队，2-需要创建企业团队） |
| GET | /api/enterprise/check-certification | EnterpriseController | 无 | 检查企业认证状态 |
| POST | /api/enterprise/create | EnterpriseController | @RateLimit | 创建团队 |
| GET | /api/enterprise/check-name | EnterpriseController | 无 | 检查团队名称是否存在 |
| POST | /api/enterprise/update-name | EnterpriseController | @EnterprisePreAuth + @RateLimit | 更新企业团队名称 |
| POST | /api/enterprise/update-logo | EnterpriseController | @EnterprisePreAuth + @RateLimit | 设置企业团队 Logo |
| POST | /api/enterprise/update-avatar | EnterpriseController | @EnterprisePreAuth + @RateLimit | 设置企业团队头像 |
| GET | /api/enterprise/detail | EnterpriseController | @EnterprisePreAuth | 获取团队详情 |
| GET | /api/enterprise/join-list | EnterpriseController | 无 | 获取所有加入的团队列表 |

### 2.2 EnterpriseUserController (`/enterprise-user`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| DELETE | /api/enterprise-user/remove | EnterpriseUserController | @EnterprisePreAuth + @RateLimit | 移除用户 |
| POST | /api/enterprise-user/update-role | EnterpriseUserController | @EnterprisePreAuth + @RateLimit | 修改用户角色 |
| POST | /api/enterprise-user/page | EnterpriseUserController | @EnterprisePreAuth | 团队成员列表（分页） |
| POST | /api/enterprise-user/quit-enterprise | EnterpriseUserController | @EnterprisePreAuth + @RateLimit | 退出企业团队 |
| GET | /api/enterprise-user/get-user-limit | EnterpriseUserController | @EnterprisePreAuth | 获取用户限制 |

### 2.3 InviteRecordController（企业邀请相关）

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/invite-record/enterprise-search-user | InviteRecordController | @EnterprisePreAuth | 企业邀请搜索用户（手机号） |
| GET | /api/invite-record/enterprise-search-username | InviteRecordController | @EnterprisePreAuth | 企业邀请搜索用户（用户名） |
| POST | /api/invite-record/enterprise-batch-search-user | InviteRecordController | @EnterprisePreAuth | 企业邀请批量搜索用户（手机号） |
| POST | /api/invite-record/enterprise-batch-search-username | InviteRecordController | @EnterprisePreAuth | 企业邀请批量搜索用户（用户名） |
| POST | /api/invite-record/enterprise-invite | InviteRecordController | @EnterprisePreAuth + @RateLimit | 邀请加入企业团队 |
| POST | /api/invite-record/enterprise-invite-list | InviteRecordController | @EnterprisePreAuth | 企业团队邀请列表 |
| POST | /api/invite-record/revoke-enterprise-invite | InviteRecordController | @EnterprisePreAuth + @RateLimit | 撤回企业邀请 |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| agent_enterprise | Enterprise | 企业团队主表 |
| agent_enterprise_user | EnterpriseUser | 企业团队成员表 |
| agent_invite_record | InviteRecord | 邀请记录表（与空间共用） |
| agent_enterprise_permission | EnterprisePermission | 企业权限配置表 |

### 关键字段

#### Enterprise（企业团队主表）
```java
@Data
public class Enterprise {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String uid;                 // 创建者 ID
    private String name;                // 团队名称
    private String logoUrl;             // Logo URL
    private String avatarUrl;           // 头像 URL
    private Long orgId;                 // 组织 ID
    private Integer serviceType;        // 套餐类型：1-团队版，2-企业版
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime expireTime;   // 过期时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer deleted;            // 删除状态：0-未删除，1-已删除
}
```

#### EnterpriseUser（企业团队成员表）
```java
@Data
public class EnterpriseUser {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long enterpriseId;          // 企业 ID
    private String uid;                 // 用户 ID
    private String nickname;            // 用户昵称
    private Integer role;               // 角色：1-Super Admin，2-Admin，3-Member
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| EnterpriseController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/EnterpriseController.java | 企业团队管理控制器 |
| EnterpriseUserController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/EnterpriseUserController.java | 企业团队成员管理控制器 |
| EnterpriseService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/EnterpriseService.java | 企业核心业务逻辑 |
| EnterpriseBizService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/space/EnterpriseBizService.java | 企业业务逻辑（Hub 层） |
| EnterpriseUserService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/EnterpriseUserService.java | 企业成员核心业务逻辑 |

### 关键业务逻辑

#### 企业团队创建流程
1. 用户检查是否需要创建团队（`/enterprise/check-need-create-team`）
2. 填写团队名称、头像
3. 检查团队名称是否重复（`/enterprise/check-name`）
4. 调用 `/enterprise/create` 创建团队
5. 创建 `Enterprise` 记录
6. 创建 `EnterpriseUser` 记录（角色为 Super Admin）
7. 返回企业 ID

#### 邀请加入企业团队流程
1. 企业管理员搜索用户（手机号或用户名）
2. 选择用户和角色（Admin 或 Member）
3. 调用 `/invite-record/enterprise-invite` 创建邀请记录
4. 系统发送邀请通知给被邀请人
5. 被邀请人接受邀请（`/invite-record/accept-invite`）
6. 创建 `EnterpriseUser` 记录
7. 更新邀请记录状态为"已加入"

#### 批量邀请流程
1. 企业管理员上传 Excel 文件（包含手机号或用户名列表）
2. 调用 `/invite-record/enterprise-batch-search-user` 或 `/invite-record/enterprise-batch-search-username`
3. 系统解析文件并返回用户列表
4. 管理员确认并批量邀请
5. 创建多条邀请记录

#### 退出企业团队流程
1. 成员调用 `/enterprise-user/quit-enterprise`
2. 删除 `EnterpriseUser` 记录
3. 如果是 Super Admin，需要先转让企业所有权

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 企业管理页面 | /enterprise | console/frontend/src/pages/enterprise-page/index.tsx | 企业管理主页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| EnterpriseList | console/frontend/src/components/enterprise-list/ | 企业列表组件 |
| CreateEnterprise | console/frontend/src/components/create-enterprise/ | 创建企业组件 |
| EnterpriseMemberManage | console/frontend/src/components/enterprise-member-manage/ | 企业成员管理组件 |
| InviteUser | console/frontend/src/components/invite-user/ | 邀请用户组件 |

## 6. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| checkNeedCreateTeam | console/frontend/src/services/enterprise.ts | GET /api/enterprise/check-need-create-team |
| checkEnterpriseName | console/frontend/src/services/enterprise.ts | GET /api/enterprise/check-name |
| createEnterprise | console/frontend/src/services/enterprise.ts | POST /api/enterprise/create |
| updateEnterpriseName | console/frontend/src/services/enterprise.ts | POST /api/enterprise/update-name |
| getEnterpriseDetail | console/frontend/src/services/enterprise.ts | GET /api/enterprise/detail |
| getEnterpriseJoinList | console/frontend/src/services/enterprise.ts | GET /api/enterprise/join-list |
| getEnterpriseSearchUsername | console/frontend/src/services/enterprise.ts | GET /api/invite-record/enterprise-search-username |
| enterpriseInvite | console/frontend/src/services/enterprise.ts | POST /api/invite-record/enterprise-invite |
| getEnterpriseMemberList | console/frontend/src/services/enterprise.ts | POST /api/enterprise-user/page |
| removeEnterpriseUser | console/frontend/src/services/enterprise.ts | DELETE /api/enterprise-user/remove |
| updateEnterpriseUserRole | console/frontend/src/services/enterprise.ts | POST /api/enterprise-user/update-role |
| revokeEnterpriseInvite | console/frontend/src/services/enterprise.ts | POST /api/invite-record/revoke-enterprise-invite |
| getEnterpriseInviteList | console/frontend/src/services/enterprise.ts | POST /api/invite-record/enterprise-invite-list |
| updateEnterpriseAvatar | console/frontend/src/services/enterprise.ts | POST /api/enterprise/update-avatar |
| quitEnterprise | console/frontend/src/services/enterprise.ts | POST /api/enterprise-user/quit-enterprise |
| getEnterpriseUserLimit | console/frontend/src/services/enterprise.ts | GET /api/enterprise-user/get-user-limit |
| batchImportEnterpriseUsername | console/frontend/src/services/enterprise.ts | POST /api/invite-record/enterprise-batch-search-username |
| visitEnterprise | console/frontend/src/services/enterprise.ts | GET /api/enterprise/visit-enterprise |
| upgradeCombo | console/frontend/src/services/enterprise.ts | POST /api/space/oss-version-user-upgrade |

## 7. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、多租户、权限校验）

### 被依赖的模块
- **space-management**：空间可以属于企业
- **bot-management**：Bot 可以在企业空间中创建
- **workflow**：工作流可以在企业空间中创建
- **knowledge**：知识库可以在企业空间中创建

## 8. 技术特性

### 8.1 权限控制
- 使用 `@EnterprisePreAuth` 注解实现企业级权限隔离
- 请求头自动携带 `enterprise-id`
- 基于角色的权限控制（Super Admin、Admin、Member）

### 8.2 限流保护
- 使用 `@RateLimit` 注解防止 API 滥用
- 不同接口有不同的限流策略（如创建团队 1 次/秒）

### 8.3 软删除
- 使用 `deleted` 字段实现逻辑删除
- 删除的企业不会物理删除，可以恢复

### 8.4 套餐管理
- 支持团队版和企业版套餐
- 不同套餐有不同的功能和成员数量限制
- 支持套餐升级（`/space/oss-version-user-upgrade`）

### 8.5 批量邀请
- 支持批量搜索用户（上传 Excel 文件）
- 支持批量邀请用户
- 使用 `multipart/form-data` 上传文件

### 8.6 访问历史
- 记录用户访问企业的历史
- 支持切换企业

## 9. 注意事项

1. **权限校验**：所有企业操作都需要进行企业级权限校验
2. **软删除**：企业使用逻辑删除（`deleted` 字段），不是物理删除
3. **退出企业**：Super Admin 退出企业前需要先转让企业所有权
4. **套餐限制**：不同套餐有不同的功能和成员数量限制
5. **邀请过期**：邀请记录有过期时间，过期后无法接受
6. **角色限制**：不同角色有不同的权限，需要正确设置
7. **企业认证**：企业版需要进行企业认证（`/enterprise/check-certification`）
8. **批量邀请**：批量邀请需要上传 Excel 文件，格式需要正确
9. **访问历史**：访问企业时会记录访问历史，用于统计和排序
10. **套餐过期**：企业套餐有过期时间（`expireTime`），过期后需要续费