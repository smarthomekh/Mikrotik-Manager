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

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (ensure build tools are installed)
RUN npm install --unsafe-perm

# Copy application source code
COPY . .

# Build client production bundle and bundled server.js
RUN npm run build

# Make startup script executable
COPY run.sh /run.sh
RUN chmod +x /run.sh

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "/run.sh" ]
