FROM node:24-bookworm-slim AS builder

WORKDIR /opt/pi-agent

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /opt/pi-agent

COPY --from=builder --chown=node:node /opt/pi-agent/package.json ./package.json
COPY --from=builder --chown=node:node /opt/pi-agent/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /opt/pi-agent/node_modules ./node_modules
COPY --from=builder --chown=node:node /opt/pi-agent/dist ./dist

USER node
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PI_AGENT_PORT || '8090') + '/healthz').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
