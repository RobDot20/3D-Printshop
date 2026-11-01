FROM node:22-bookworm-slim

RUN mkdir -p /app && chown -R node:node /app
USER node
WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/
COPY --chown=node:node apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --include-workspace-root

COPY --chown=node:node packages/shared ./packages/shared
COPY --chown=node:node apps/api ./apps/api

EXPOSE 4000
CMD ["node", "apps/api/src/index.js"]
