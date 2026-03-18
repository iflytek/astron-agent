# Space Management 模块文档

## 1. 模块概述

Space Management（空间管理）模块负责管理个人空间和企业空间的创建、编辑、删除、成员管理、邀请管理、申请管理等功能。空间是 Astron Agent Console 的核心组织单元，用于隔离不同用户或团队的资源（Bot、工作流、知识库等）。

### 核心功能
- **空间管理**：创建、编辑、删除、访问个人空间和企业空间
- **成员管理**：添加、移除、修改成员角色、转让空间
- **邀请管理**：邀请用户加入空间、撤回邀请、接受/拒绝邀请
- **申请管理**：申请加入企业空间、审批申请
- **权限控制**：基于角色的权限控制（Owner、Admin、Member）

### 空间类型
1. **个人空间**（Personal Space）：用户自己创建的空间，完全由用户控制
2. **企业空间**（Corporate Space）：企业创建的空间，由企业管理员管理

### 角色体系
- **Owner（所有者）**：空间创建者，拥有最高权限
- **Admin（管理员）**：可以管理空间成员和资源
- **Member（成员）**：普通成员，可以使用空间资源

## 2. 后端 API

### 2.1 SpaceController (`/space`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/space/check-name | SpaceController | 无 | 检查空间名称是否存在 |
| GET | /api/space/visit-space | SpaceController | 无 | 访问空间（记录访问历史） |
| GET | /api/space/recent-visit-list | SpaceController | 无 | 最近访问列表 |
| GET | /api/space/get-last-visit-space | SpaceController | 无 | 获取最近访问的空间 |
| GET | /api/space/personal-list | SpaceController | 无 | 个人全部空间（包括创建和加入的） |
| GET | /api/space/personal-self-list | SpaceController | 无 | 个人创建的空间 |
| GET | /api/space/detail | SpaceController | @SpacePreAuth | 获取空间详情 |
| GET | /api/space/send-message-code | SpaceController | @RateLimit | 删除空间发送验证码 |
| DELETE | /api/space/delete-personal-space | SpaceController | @RateLimit | 个人空间所有者删除空间 |
| POST | /api/space/oss-version-user-upgrade | SpaceController | @RateLimit | OSS 版本用户升级到企业版 |
| POST | /api/space/create-personal-space | SpaceController | @RateLimit | 创建个人空间 |
| POST | /api/space/update-personal-space | SpaceController | @SpacePreAuth + @RateLimit | 编辑个人空间信息 |
| POST | /api/space/create-corporate-space | SpaceController | @EnterprisePreAuth + @RateLimit | 创建企业空间 |
| DELETE | /api/space/delete-corporate-space | SpaceController | @EnterprisePreAuth + @RateLimit | 删除企业空间 |
| POST | /api/space/update-corporate-space | SpaceController | @EnterprisePreAuth + @RateLimit | 编辑企业空间信息 |
| GET | /api/space/corporate-list | SpaceController | @EnterprisePreAuth | 企业全部空间 |
| GET | /api/space/corporate-count | SpaceController | @EnterprisePreAuth | 企业全部空间数量 |
| GET | /api/space/corporate-join-list | SpaceController | @EnterprisePreAuth | 企业我加入的空间 |

### 2.2 SpaceUserController (`/space-user`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/space-user/enterprise-add | SpaceUserController | @SpacePreAuth + @RateLimit | 企业空间添加用户 |
| DELETE | /api/space-user/remove | SpaceUserController | @SpacePreAuth + @RateLimit | 移除用户 |
| POST | /api/space-user/update-role | SpaceUserController | @SpacePreAuth + @RateLimit | 修改用户角色 |
| POST | /api/space-user/page | SpaceUserController | @SpacePreAuth | 空间成员列表（分页） |
| POST | /api/space-user/quit-space | SpaceUserController | @SpacePreAuth + @RateLimit | 离开空间 |
| GET | /api/space-user/list-space-member | SpaceUserController | @SpacePreAuth | 查询空间所有成员（不包括所有者） |
| POST | /api/space-user/transfer-space | SpaceUserController | @SpacePreAuth + @RateLimit | 转让空间 |
| GET | /api/space-user/get-user-limit | SpaceUserController | @SpacePreAuth | 获取用户限制 |

### 2.3 InviteRecordController (`/invite-record`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| GET | /api/invite-record/get-invite-by-param | InviteRecordController | 无 | 根据参数获取邀请记录 |
| GET | /api/invite-record/space-search-user | InviteRecordController | @SpacePreAuth | 空间邀请搜索用户（手机号） |
| GET | /api/invite-record/space-search-username | InviteRecordController | @SpacePreAuth | 空间邀请搜索用户（用户名） |
| POST | /api/invite-record/space-invite | InviteRecordController | @SpacePreAuth + @RateLimit | 邀请加入空间 |
| POST | /api/invite-record/space-invite-list | InviteRecordController | @SpacePreAuth | 空间邀请列表 |
| GET | /api/invite-record/enterprise-search-user | InviteRecordController | @EnterprisePreAuth | 企业邀请搜索用户（手机号） |
| GET | /api/invite-record/enterprise-search-username | InviteRecordController | @EnterprisePreAuth | 企业邀请搜索用户（用户名） |
| POST | /api/invite-record/enterprise-batch-search-user | InviteRecordController | @EnterprisePreAuth | 企业邀请批量搜索用户（手机号） |
| POST | /api/invite-record/enterprise-batch-search-username | InviteRecordController | @EnterprisePreAuth | 企业邀请批量搜索用户（用户名） |
| POST | /api/invite-record/enterprise-invite | InviteRecordController | @EnterprisePreAuth + @RateLimit | 邀请加入企业团队 |
| POST | /api/invite-record/enterprise-invite-list | InviteRecordController | @EnterprisePreAuth | 企业团队邀请列表 |
| POST | /api/invite-record/accept-invite | InviteRecordController | @RateLimit | 接受邀请 |
| POST | /api/invite-record/refuse-invite | InviteRecordController | @RateLimit | 拒绝邀请 |
| POST | /api/invite-record/revoke-enterprise-invite | InviteRecordController | @EnterprisePreAuth + @RateLimit | 撤回企业邀请 |
| POST | /api/invite-record/revoke-space-invite | InviteRecordController | @SpacePreAuth + @RateLimit | 撤回空间邀请 |

### 2.4 ApplyRecordController (`/apply-record`)

| 方法 | 路径 | Controller | 权限 | 说明 |
|------|------|-----------|------|------|
| POST | /api/apply-record/join-enterprise-space | ApplyRecordController | @EnterprisePreAuth + @RateLimit | 申请加入企业空间 |
| POST | /api/apply-record/agree-enterprise-space | ApplyRecordController | @SpacePreAuth + @RateLimit | 同意申请加入企业空间 |
| POST | /api/apply-record/refuse-enterprise-space | ApplyRecordController | @SpacePreAuth + @RateLimit | 拒绝申请加入企业空间 |
| POST | /api/apply-record/page | ApplyRecordController | @SpacePreAuth | 申请列表（分页） |

## 3. 数据模型

### 表结构

| 表名 | Entity 类 | 说明 |
|------|----------|------|
| agent_space | Space | 空间主表 |
| agent_space_user | SpaceUser | 空间成员表 |
| agent_invite_record | InviteRecord | 邀请记录表 |
| agent_apply_record | ApplyRecord | 申请记录表 |
| agent_space_permission | SpacePermission | 空间权限配置表 |

### 关键字段

#### Space（空间主表）
```java
@Data
public class Space {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private String name;                // 空间名称
    private String description;         // 描述
    private String avatarUrl;           // 头像 URL
    private String uid;                 // 创建者 ID
    private Long enterpriseId;          // 企业 ID（个人空间为 null）
    private Integer type;               // 类型：1-Free，2-Pro，3-Team，4-Enterprise
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
    private Integer deleted;            // 删除状态：0-未删除，1-已删除
}
```

#### SpaceUser（空间成员表）
```java
@Data
public class SpaceUser {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long spaceId;               // 空间 ID
    private String uid;                 // 用户 ID
    private String nickname;            // 用户昵称
    private Integer role;               // 角色：1-Owner，2-Admin，3-Member
    private LocalDateTime lastVisitTime; // 最后访问时间
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
}
```

#### InviteRecord（邀请记录表）
```java
@Data
public class InviteRecord {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Integer type;               // 邀请类型：1-空间，2-团队
    private Long spaceId;               // 空间 ID
    private Long enterpriseId;          // 企业 ID
    private String inviteeUid;          // 被邀请人 UID
    private Integer role;               // 加入角色：1-Admin，2-Member
    private String inviteeNickname;     // 被邀请人昵称
    private String inviterUid;          // 邀请人 UID
    private LocalDateTime expireTime;   // 过期时间
    private Integer status;             // 状态：1-初始，2-已拒绝，3-已加入，4-已撤回，5-已过期
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
}
```

#### ApplyRecord（申请记录表）
```java
@Data
public class ApplyRecord {
    @TableId(type = IdType.AUTO)
    private Long id;                    // 主键
    private Long enterpriseId;          // 企业团队 ID
    private Long spaceId;               // 空间 ID
    private String applyUid;            // 申请人 UID
    private String applyNickname;       // 申请人昵称
    private LocalDateTime applyTime;    // 申请时间
    private Integer status;             // 申请状态：1-待审核，2-已同意，3-已拒绝
    private LocalDateTime auditTime;    // 审核时间
    private String auditUid;            // 审核人 UID
    private LocalDateTime createTime;   // 创建时间
    private LocalDateTime updateTime;   // 更新时间
}
```

## 4. 后端核心类

| 类名 | 路径 | 职责 |
|------|------|------|
| SpaceController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/SpaceController.java | 空间管理控制器 |
| SpaceUserController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/SpaceUserController.java | 空间成员管理控制器 |
| InviteRecordController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/InviteRecordController.java | 邀请管理控制器 |
| ApplyRecordController | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/controller/space/ApplyRecordController.java | 申请管理控制器 |
| SpaceService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/SpaceService.java | 空间核心业务逻辑 |
| SpaceBizService | console/backend/hub/src/main/java/com/iflytek/astron/console/hub/service/space/SpaceBizService.java | 空间业务逻辑（Hub 层） |
| SpaceUserService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/SpaceUserService.java | 空间成员核心业务逻辑 |
| InviteRecordService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/InviteRecordService.java | 邀请记录核心业务逻辑 |
| ApplyRecordService | console/backend/commons/src/main/java/com/iflytek/astron/console/commons/service/space/ApplyRecordService.java | 申请记录核心业务逻辑 |

### 关键业务逻辑

#### 空间创建流程
1. 用户填写空间名称、描述、头像
2. 检查空间名称是否重复（`/space/check-name`）
3. 调用 `/space/create-personal-space` 或 `/space/create-corporate-space`
4. 创建 `Space` 记录
5. 创建 `SpaceUser` 记录（角色为 Owner）
6. 返回空间 ID

#### 邀请加入空间流程
1. 空间管理员搜索用户（手机号或用户名）
2. 选择用户和角色（Admin 或 Member）
3. 调用 `/invite-record/space-invite` 创建邀请记录
4. 系统发送邀请通知给被邀请人
5. 被邀请人接受邀请（`/invite-record/accept-invite`）
6. 创建 `SpaceUser` 记录
7. 更新邀请记录状态为"已加入"

#### 申请加入企业空间流程
1. 用户浏览企业空间列表
2. 选择空间并申请加入（`/apply-record/join-enterprise-space`）
3. 创建 `ApplyRecord` 记录（状态为"待审核"）
4. 空间管理员审批申请（`/apply-record/agree-enterprise-space` 或 `/apply-record/refuse-enterprise-space`）
5. 如果同意，创建 `SpaceUser` 记录
6. 更新申请记录状态

#### 转让空间流程
1. 空间所有者选择新的所有者（必须是空间成员）
2. 调用 `/space-user/transfer-space`
3. 更新原所有者的角色为 Admin
4. 更新新所有者的角色为 Owner
5. 更新 `Space` 表的 `uid` 字段

#### 删除空间流程
1. 空间所有者发送验证码（`/space/send-message-code`）
2. 输入验证码确认删除（`/space/delete-personal-space` 或 `/space/delete-corporate-space`）
3. 软删除 `Space` 记录（`deleted = 1`）
4. 删除所有 `SpaceUser` 记录
5. 删除空间下的所有资源（Bot、工作流、知识库等）

## 5. 前端页面

| 页面 | 路由 | 组件路径 | 说明 |
|------|------|---------|------|
| 空间管理页面 | /space | console/frontend/src/pages/space-page/index.tsx | 空间管理主页面 |

### 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| SpaceList | console/frontend/src/components/space-list/ | 空间列表组件 |
| CreateSpace | console/frontend/src/components/create-space/ | 创建空间组件 |
| SpaceMemberManage | console/frontend/src/components/space-member-manage/ | 空间成员管理组件 |
| InviteUser | console/frontend/src/components/invite-user/ | 邀请用户组件 |

## 6. 前端 API Service

| 函数 | 路径 | 对应后端 API |
|------|------|-------------|
| personalSpaceCreate | console/frontend/src/services/space.ts | POST /api/space/create-personal-space |
| getAllSpace | console/frontend/src/services/space.ts | GET /api/space/personal-list |
| visitSpace | console/frontend/src/services/space.ts | GET /api/space/visit-space |
| getRecentVisit | console/frontend/src/services/space.ts | GET /api/space/recent-visit-list |
| getMyCreateSpace | console/frontend/src/services/space.ts | GET /api/space/personal-self-list |
| updatePersonalSpace | console/frontend/src/services/space.ts | POST /api/space/update-personal-space |
| deletePersonalSpace | console/frontend/src/services/space.ts | DELETE /api/space/delete-personal-space |
| deleteSpaceSendCode | console/frontend/src/services/space.ts | GET /api/space/send-message-code |
| checkSpaceName | console/frontend/src/services/space.ts | GET /api/space/check-name |
| getSpaceDetail | console/frontend/src/services/space.ts | GET /api/space/detail |
| getSpaceMemberList | console/frontend/src/services/space.ts | POST /api/space-user/page |
| getAllCorporateList | console/frontend/src/services/space.ts | GET /api/space/corporate-list |
| getJoinedCorporateList | console/frontend/src/services/space.ts | GET /api/space/corporate-join-list |
| createCorporateSpace | console/frontend/src/services/space.ts | POST /api/space/create-corporate-space |
| updateCorporateSpace | console/frontend/src/services/space.ts | POST /api/space/update-corporate-space |
| deleteCorporateSpace | console/frontend/src/services/space.ts | DELETE /api/space/delete-corporate-space |
| getLastVisitSpace | console/frontend/src/services/space.ts | GET /api/space/get-last-visit-space |
| getSpaceSearchUser | console/frontend/src/services/space.ts | GET /api/invite-record/space-search-user |
| getSpaceSearchUsername | console/frontend/src/services/space.ts | GET /api/invite-record/space-search-username |
| updateUserRole | console/frontend/src/services/space.ts | POST /api/space-user/update-role |
| deleteUser | console/frontend/src/services/space.ts | DELETE /api/space-user/remove |
| leaveSpace | console/frontend/src/services/space.ts | POST /api/space-user/quit-space |
| spaceInvite | console/frontend/src/services/space.ts | POST /api/invite-record/space-invite |
| revokeSpaceInvite | console/frontend/src/services/space.ts | POST /api/invite-record/revoke-space-invite |
| getSpaceInviteList | console/frontend/src/services/space.ts | POST /api/invite-record/space-invite-list |
| joinEnterpriseSpace | console/frontend/src/services/space.ts | POST /api/apply-record/join-enterprise-space |
| agreeEnterpriseSpace | console/frontend/src/services/space.ts | POST /api/apply-record/agree-enterprise-space |
| refuseEnterpriseSpace | console/frontend/src/services/space.ts | POST /api/apply-record/refuse-enterprise-space |
| getApllyRecord | console/frontend/src/services/space.ts | POST /api/apply-record/page |
| getEnterpriseSpaceMemberList | console/frontend/src/services/space.ts | GET /api/space-user/list-space-member |
| transferSpace | console/frontend/src/services/space.ts | POST /api/space-user/transfer-space |
| getSpaceUserLimit | console/frontend/src/services/space.ts | GET /api/space-user/get-user-limit |
| getCorporateCount | console/frontend/src/services/space.ts | GET /api/space/corporate-count |

## 7. 模块间依赖

### 依赖的模块
- **commons**：依赖公共服务（认证、多租户、权限校验）
- **enterprise-management**：空间可以属于企业

### 被依赖的模块
- **bot-management**：Bot 需要关联空间
- **workflow**：工作流需要关联空间
- **knowledge**：知识库需要关联空间
- **model-management**：模型需要关联空间

## 8. 技术特性

### 8.1 权限控制
- 使用 `@SpacePreAuth` 注解实现空间级权限隔离
- 使用 `@EnterprisePreAuth` 注解实现企业级权限隔离
- 请求头自动携带 `space-id` 和 `enterprise-id`
- 基于角色的权限控制（Owner、Admin、Member）

### 8.2 限流保护
- 使用 `@RateLimit` 注解防止 API 滥用
- 不同接口有不同的限流策略（如删除空间 1 次/秒）

### 8.3 软删除
- 使用 `deleted` 字段实现逻辑删除
- 删除的空间不会物理删除，可以恢复

### 8.4 访问历史
- 记录用户访问空间的历史（`lastVisitTime`）
- 支持最近访问列表（`/space/recent-visit-list`）

### 8.5 邀请过期机制
- 邀请记录有过期时间（`expireTime`）
- 系统定时任务检查并更新过期邀请状态

### 8.6 批量邀请
- 支持批量搜索用户（上传 Excel 文件）
- 支持批量邀请用户

### 8.7 验证码保护
- 删除空间需要验证码确认
- 防止误删除

## 9. 注意事项

1. **权限校验**：所有空间操作都需要进行权限校验
2. **软删除**：空间使用逻辑删除（`deleted` 字段），不是物理删除
3. **转让空间**：只有所有者可以转让空间，且新所有者必须是空间成员
4. **删除空间**：删除空间需要验证码确认，且会删除空间下的所有资源
5. **邀请过期**：邀请记录有过期时间，过期后无法接受
6. **角色限制**：不同角色有不同的权限，需要正确设置
7. **企业空间**：企业空间需要企业级权限，个人用户无法创建
8. **空间类型**：空间类型（Free、Pro、Team、Enterprise）决定了空间的功能和限制
9. **成员限制**：不同空间类型有不同的成员数量限制
10. **访问历史**：访问空间时会更新 `lastVisitTime`，用于统计和排序
