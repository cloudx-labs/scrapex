#FROM node:20-alpine
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

ENV NODE_ENV=production

RUN apt update && apt install dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

# Add non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /usr/src/app

# Switch to the non-root user
USER appuser

COPY . .

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "-r", "dotenv/config", "./src/server.js"]
