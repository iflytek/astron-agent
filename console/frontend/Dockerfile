#############################################
# 1) Builder：仅在构建机平台编译一次前端
#############################################
FROM --platform=$BUILDPLATFORM node:18-alpine AS builder

WORKDIR /app

RUN npm config set registry https://registry.npmjs.org/

# 只拷贝依赖清单，利于缓存命中
COPY console/frontend/package*.json ./

# 使用 BuildKit 缓存挂载，加速 npm；用 npm ci 更可复现
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# 再拷贝源码，进行构建
COPY console/frontend/ ./
RUN npm run build-prod


#############################################
# 2) Runtime：按目标平台各自封装 Nginx 镜像
#############################################
FROM nginx:1.15-alpine

# 接收来自 GitHub Actions 的构建参数（可用于打标）
ARG VERSION
ARG GIT_COMMIT
ARG BUILD_TIME

# 给镜像打上构建信息，便于排错与追溯
LABEL org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$GIT_COMMIT \
      org.opencontainers.image.created=$BUILD_TIME

# 运行端口
ENV NGINX_PORT=1881

RUN echo "user  nginx; \
worker_processes  8; \
error_log  /var/log/nginx/error.log error; \
pid        /var/run/nginx.pid; \
events { worker_connections  65535; } \
http { \
  include       /etc/nginx/mime.types; \
  default_type  application/octet-stream; \
  sendfile      on; \
  keepalive_timeout 65; \
  gzip on; \
  gzip_http_version 1.0; \
  gzip_disable \"MSIE [1-6].\"; \
  gzip_types text/plain application/x-javascript text/css application/javascript text/javascript; \
  server { \
    listen ${NGINX_PORT}; \
    index index.html; \
    root /var/www; \
    access_log off; \
    location = /runtime-config.js { \
      expires -1; \
      add_header Cache-Control \"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0\"; \
      add_header Pragma \"no-cache\"; \
    } \
    location / { \
      try_files \$uri \$uri/ /index.html; \
      expires -1; \
    } \
    location ~ .*\.(gif|jpg|jpeg|png|PNG|bmp|swf|asp|cfm|xml|py|pl|lasso|cfc|afp|txt|zip|log|ico|csv|json|xls|pdf|mp3|mp4|apk)$ { \
      expires 1y; access_log off; \
    } \
    location ~ .*\.(js|css)?$ { \
      expires 1y; access_log off; \
    } \
  } \
}" > /etc/nginx/nginx.conf

EXPOSE ${NGINX_PORT}

# 只复制一次构建出的静态资源
COPY --from=builder /app/dist /var/www

COPY console/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]