ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    PORT=3000

# Install Node.js, npm, bash, curl, and jq if not already present
RUN if ! command -v node >/dev/null 2>&1; then \
      apk add --no-cache nodejs npm bash curl jq; \
    else \
      apk add --no-cache bash curl jq; \
    fi

WORKDIR /app

# Copy all repository files (including pre-built dist)
COPY . .

# Install dependencies:
# If pre-built dist/ is present, only install lightweight runtime dependencies (fast & zero memory crash).
# Otherwise compile from source.
RUN if [ -f "dist/server.js" ] && [ -f "dist/index.html" ]; then \
      echo "=== Pre-built dist detected. Installing lightweight runtime dependencies... ===" && \
      npm install --omit=dev --no-audit --no-fund; \
    else \
      echo "=== No pre-built dist found. Compiling from source... ===" && \
      npm install --unsafe-perm && \
      npm run build && \
      npm prune --production; \
    fi

# Make startup script executable
COPY run.sh /run.sh
RUN chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
