FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/client/package.json ./apps/client/

RUN npm ci --workspace=apps/client --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/client ./apps/client

RUN npm run build --workspace=apps/client

FROM nginx:alpine
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
