# 配置与认证 FAQ

## 如何注册和登录？

访问同一控制台的 `/register`，使用用户名和密码注册；访问 `/login` 登录，`/account` 修改资料、修改密码或退出。没有预置管理员密码，不依赖邮箱、短信或外部身份服务。

## 旧账号怎样登录？

原用户 ID、资料和资源归属保留。管理员按 [Python Console 运维说明](../console/backend/README.md) 导入旧用户，核实身份后发放一次性重设密码链接。旧密码不导入；忘记密码也通过管理员重设。

## 登录循环、登录状态丢失或写请求返回 403？

确认页面和 `/console-api/` 使用同一 origin，代理保留 Host 及端口并正确转发 Cookie。默认 IP 访问无需填写地址变量，Cookie 随 HTTP/HTTPS 自动设置，写请求仍必须携带当前 CSRF Token。只有自定义域名、跨 origin 或额外 HTTPS 代理时，才需核对显式的允许主机、可信来源和代理配置；详见 [Console 运维说明](../console/backend/README.md)。

## 修改访问域名或端口后如何处理？

默认 IP 或端口变化不需要修改 Console 环境变量。使用自定义域名时配置 `CONSOLE_ALLOWED_HOSTS`；若已显式设置 `CONSOLE_PUBLIC_ORIGIN` 或可信来源，则同步更新这些覆盖项。切换访问主机后浏览器 Cookie 不共享，需要重新登录。

## 可以关闭注册或切换组织吗？

Console 提供开放注册，没有注册开关。空间与组织管理通过已登录账号的成员和权限设置控制。
