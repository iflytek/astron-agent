# 配置与认证 FAQ

## 登录后一直在登录页循环，或跳转到 localhost？

1. Casdoor 配置: Casdoor 的 origin  和 redirect_uri  必须与浏览器访问的地址一致。
2. Casdoor 后台: 登录 Casdoor 管理后台 (默认端口 8000)，检查 Application 的回调地址配置。

## 默认的账号密码是什么？

- Casdoor (管理后台): 账号 admin ，密码 123 。
- Ragflow: 需要自行注册账号。

## Casdoor 支持 HTTPS 吗？

目前 Astron 内置的 Casdoor 配置可能不支持直接开启 HTTPS。建议在 Casdoor 服务前添加一层
Nginx 反向代理 来处理 SSL/HTTPS 加密。

## 创建应用失败，日志显示 403 错误？

403 通常是权限或认证问题。请检查环境变量配置（如 API Key、Secret 等）是否正确填写，且与部署文档要求一致。

## 修改了 IP 地址或端口配置后不生效？

修改 .env  文件或 docker-compose.yaml  中的环境变量后，必须重启容器才能生效：
docker compose down  然后 docker compose up -d 。

## 客户端可以切换组织吗？

可以。客户端登录基于 Casdoor 认证。请参考 带认证的部署指南，在 Casdoor 管理页面进行组织和用户的配置。
