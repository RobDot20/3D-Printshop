FROM node:22-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app && chown -R node:node /app
USER node
WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/
COPY --chown=node:node apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --include-workspace-root

COPY --chown=node:node packages/shared ./packages/shared
COPY --chown=node:node apps/api ./apps/api

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

EXPOSE 4000
CMD ["node", "apps/api/src/index.js"]
