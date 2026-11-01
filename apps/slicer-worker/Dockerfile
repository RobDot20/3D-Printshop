FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    cura-engine \
    prusa-slicer \
    libgomp1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app /app/profiles && chown -R node:node /app
USER node
WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/
COPY --chown=node:node apps/slicer-worker/package.json ./apps/slicer-worker/

RUN npm ci --workspace=apps/slicer-worker --include-workspace-root

COPY --chown=node:node packages/shared ./packages/shared
COPY --chown=node:node apps/slicer-worker ./apps/slicer-worker
COPY --chown=node:node docker/slicer-profiles /app/profiles

CMD ["node", "apps/slicer-worker/src/index.js"]
