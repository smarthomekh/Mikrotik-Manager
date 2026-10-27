ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PORT=3000 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_legacy_peer_deps=true

RUN if ! command -v node >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm bash curl jq; \
    else \
      apk add --no-cache bash curl jq; \
    fi

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps --no-audit --no-fund; \
    else \
      npm install --include=dev --legacy-peer-deps --no-audit --no-fund; \
    fi

COPY . .

RUN if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ] || [ -f "src/main.tsx" ] || [ -f "server.ts" ]; then \
      echo "=== Build inputs detected. Running build... ===" && \
      npm run build; \
    else \
      echo "=== No app source files detected; skipping build step. ==="; \
    fi

RUN npm prune --production --legacy-peer-deps || true

COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
