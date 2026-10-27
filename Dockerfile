ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PORT=3000 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_legacy_peer_deps=true

# Install runtime tools needed by the container and build stage
RUN if ! command -v node >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm bash curl jq; \
    else \
      apk add --no-cache bash curl jq; \
    fi

WORKDIR /app

# Install dependencies first so the build is deterministic even when dist is missing
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps --no-audit --no-fund

# Copy the full source tree (including prebuilt dist if present)
COPY . .

# Build the app only when source files are present; skip gracefully if repo is intentionally prebuilt
RUN if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ] || [ -f "src/main.tsx" ] || [ -f "server.ts" ]; then \
      echo "=== Build inputs detected. Running production build... ===" && \
      npm run build; \
    else \
      echo "=== No frontend/server source detected; skipping build step. ==="; \
    fi

# Remove development dependencies from the final runtime image to keep it lighter
RUN npm prune --production --legacy-peer-deps || true

# Make startup script executable and fix CRLF issues
COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
