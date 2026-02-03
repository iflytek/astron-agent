# 故障排查 FAQ

## 数据库报错 "PostgreSQL node request error", "SQLSyntaxErrorException" 或 SQL 语法错误？

1. 检查 SQL: 确认生成的 SQL 语句是否合法，字段是否匹配。
2. 版本同步: 如果代码更新了但数据库报错，可能是数据库 Schema 未同步。尝试运行 docker
compose up -d atlas  或手动执行 SQL 补全字段。
3. 常见错误: SQLSyntaxErrorException  通常是代码更新了但数据库未自动迁移。查看日志中
的 SQL 错误，手动在数据库执行缺少的字段添加操作。

## 数据库迁移失败 "Validate failed: Migrations have failed validation"？

这是 Flyway 版本控制冲突。
- 测试环境: docker compose down -v  清空数据重置。
- 生产环境: 手动修复 flyway_schema_history  表。

## 接口报错 "auth name: Authorization, auth value: None"？

1. Token 丢失: 请求头未携带有效的 Authorization Token。
2. 配置错误: 检查 Casdoor Client ID/Secret 是否与 .env  一致。

## 调用第三方工具报错 SSL 错误？

这通常是容器内的 SSL 证书问题或网络环境导致的。检查容器是否能正常访问公网 HTTPS 地址。

## 服务启动失败 (如 astron-core-link  returned non-zero exit status 1) 如 何排查？

1. 检查端口: 可能是端口冲突被占用，请检查相关端口的使用情况。
2. 查看日志: 使用 docker logs <container_name>  查看详细报错日志以定位问题。

## 跨域问题 (CORS) 如何解决？

前端调用后端接口报跨域错误时，请检查 Nginx 代理配置或后端服务的 CORS 允许域名配置。

## 启动后 core-tenant  或 core-aitools  服务一直重启，且报错连不上数 据库？

1. 检查 .env  文件中的 MySQL 配置是否正确。
2. 尝试手动重启 MySQL 容器：docker restart astron-agent-mysql （具体容器名请通
过 docker ps  确认）。
3. 如果问题依旧，尝试执行 docker compose down -v  清理后重新启动。 页面

## 页面访问报错或加载不出来，如何排查？

1. 浏览器控制台：按 Ctrl + Shift + I  (Windows) 或 Cmd + Option + I  (Mac) 打开开发
者工具，查看 Network 面板是否有请求报错（红色 4xx/500 错误）。
2. 查看容器日志：
- 查看所有日志：docker compose logs -f
- 查看特定服务日志：docker compose logs -f <服务名>  (例如 astron-agent-
console-hub , astron-agent-core-tenant )。
- 特别关注 core-tenant  (租户服务) 和 console-hub  (控制台后端) 的日志。

## 数据库更新或字段缺失导致报错怎么办？

尝试拉取最新代码 ( git pull )，然后运行 docker compose up -d atlas  来执行数据库迁移，更新字段。

## 通过 API 调用工作流报错 Failed to get application ？

1. 检查鉴权信息：确保 Header 中正确传递了 Authorization: Bearer {API_KEY}:
{API_SECRET} 。
2. 检查 ID 匹配：
- 确保使用的 flow_id  与发布的 API ID 一致。
- 注意区分 App ID  和 Flow ID 。
- 确认请求 URL 中的 Host 和 Port 是否正确（指向 console-hub  或网关端口）。
3. 参数替换：如果是从示例代码复制，确保 xxx  等占位符已替换为实际值。
