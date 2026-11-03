# 配置与认证 FAQ

## 如何注册和登录？

访问同一控制台的 `/register`，使用用户名和密码注册；访问 `/login` 登录，`/account` 修改资料、修改密码或退出。没有预置管理员密码，不依赖邮箱、短信或外部身份服务。

## 旧账号怎样登录？

原用户 ID、资料和资源归属保留。管理员按 [Python Console 运维说明](../console/backend/README.md) 导入旧用户，核实身份后发放一次性重设密码链接。旧密码不导入；忘记密码也通过管理员重设。

## 登录循环、登录状态丢失或写请求返回 403？

确认页面和 `/console-api/` 使用同一 origin，代理正确转发 Cookie。核对 `CONSOLE_PUBLIC_ORIGIN`、`CONSOLE_ALLOWED_HOSTS` 和 `CONSOLE_CSRF_TRUSTED_ORIGINS`。公开部署使用 HTTPS 和安全 Cookie；仅隔离 HTTP 验证设置 `CONSOLE_COOKIE_SECURE=false`。写请求必须携带当前 CSRF Token。

## 修改访问域名或端口后如何处理？

同步更新上述 origin、主机与代理配置并重新部署。用户可能需要重新登录；不再配置 OAuth 回调地址。

## 可以关闭注册或切换组织吗？

本阶段交付开放注册，没有注册开关。空间与组织管理属于后续资源迁移；不要通过修改旧身份系统配置实现。
