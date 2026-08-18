# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.23 AS builder
ARG TARGETOS=linux
ARG TARGETARCH
WORKDIR /opt/tenant
ENV GOPROXY=https://goproxy.cn,direct
COPY ./core/tenant/go.mod ./core/tenant/go.sum ./
RUN go mod download
COPY ./core/tenant .
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o tenant .

FROM scratch
WORKDIR /opt/tenant
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /opt/tenant/tenant .
STOPSIGNAL SIGTERM
CMD ["./tenant"]
