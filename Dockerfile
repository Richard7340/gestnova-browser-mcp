FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache tini curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV PORT=8018
EXPOSE 8018

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8018/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/server.js"]
