# Astron Agent Helm 部署指南

## 部署前置条件

1. 已具备可用的 Kubernetes（K8s）集群环境，并配置好 `kubectl` 可访问集群
2. 集群已安装 Ingress Controller（推荐 `ingress-nginx`），用于 Ingress 网络路由（若启用 `ingress.enabled=true`）
3. 已安装 Helm 3（`helm` 命令可用）

## 快速部署

### 1. 克隆项目

```bash
# 克隆仓库
git clone https://github.com/iflytek/astron-agent.git
cd astron-agent/helm/astron-agent
```

### 2. 修改配置

编辑 `astron-agent/values.yaml`，修改关键配置：

```yaml
# 全局配置 - 主机访问地址
global:
  # 镜像版本
  astronAgentVersion: latest
  
  # 主机地址，用于 MinIO、Casdoor 等服务的外部访问
  # 例如: http://your-domain.com
  hostBaseAddress: "http://your-domain.com"
  
  # 配置 讯飞开放平台 相关 APP_ID API_KEY 等信息
  #获取文档详见：https://www.xfyun.cn/doc/platform/quickguide.html
  platformAppId: "your-app-id"
  platformApiKey: "your-api-key"
  platformApiSecret: "your-api-secret"
  # https://console.xfyun.cn/services/bm4
  sparkApiPassword: "your-api-password"
  # https://console.xfyun.cn/services/rta
  sparkRtasrApiKey: "your-rtasr-api-key"

# 修改ingress域名，与hostBaseAddress保持一致
ingress:
  enabled: true
  hosts:
    - host: your-domain.com
  tls:
      hosts:
        - your-domain.com
```

### 3. 部署

```bash
# 使用 Helm 安装
helm install astron-agent . -n astron-agent --create-namespace
```

### 4. 访问应用

- **生产环境**：配置域名解析后访问 `http://your-domain.com`

## 可选：NodePort + 外挂 Nginx（对外 80 端口）

当集群没有 `LoadBalancer`（云 LB/MetalLB）能力时，可以将 Ingress Controller（如 `ingress-nginx`）以 `NodePort` 方式暴露，再在集群外入口机部署一层 Nginx 监听 80，将流量转发到 `ingress-nginx-controller` 的 `NodePort`。

1. 获取 `ingress-nginx-controller` 的 NodePort（示例命令）：

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller
```

2. 在入口机部署 Nginx（对外监听 80），将请求转发到任一 K8s 节点 IP + 上一步的 `NodePort`：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://<any-k8s-node-ip>:<ingress-nodeport>;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 相关资源

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Helm 官方文档](https://helm.sh/docs/)
- [Astron Agent GitHub](https://github.com/iflytek/astron-agent)
