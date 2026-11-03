# 控制台部署与账号迁移

控制台已改为 Python 内部用户名/密码注册登录。统一使用 [部署指南](DEPLOYMENT_GUIDE.md) 和 [Python Console 运维说明](../../console/backend/README.md)，不再提供独立认证服务或旧的联合启动入口。

新用户通过 `/register` 注册；没有默认管理员密码。已有用户保留原 UID 和资源归属，由管理员核实身份后发放一次性重设密码链接。

RPA 外部应用仍有独立身份依赖；新的 Console 登录不能直接替代它。当前迁移阶段暂不提供 Agent 与 RPA 的联合登录/启动，集成在发布与渠道阶段恢复。
