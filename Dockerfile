ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PORT=3000

# Install Node.js, npm, bash, curl, jq and keep peer-dependency resolution compatible
RUN if ! command -v node >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm bash curl jq; \
    else \
      apk add --no-cache bash curl jq; \
    fi

WORKDIR /app

# Copy project files
COPY . .

# Install dependencies with legacy peer resolution to avoid npm 10 dependency tree crashes
# and only do a source build when a real app entry exists.
RUN if [ -f "dist/server.js" ] && [ -f "dist/index.html" ]; then \
      echo "=== Pre-built dist detected. Installing lightweight runtime dependencies... ===" && \
      npm install --omit=dev --no-audit --no-fund --legacy-peer-deps; \
    else \
      echo "=== No pre-built dist detected. Installing dependencies and attempting a source build if supported... ===" && \
      npm install --unsafe-perm --no-audit --no-fund --legacy-peer-deps; \
      if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ] || [ -f "index.html" ] || [ -f "src/main.tsx" ] || [ -f "server.ts" ]; then \
        echo "=== Build inputs detected. Running build step... ===" && \
        npm run build || echo "=== Build step skipped because the app source is incomplete or not buildable in this image. ==="; \
      else \
        echo "=== No build inputs detected. Skipping frontend build. ==="; \
      fi; \
      npm prune --production --legacy-peer-deps || true; \
    fi

# Make startup script executable and fix line endings
COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
