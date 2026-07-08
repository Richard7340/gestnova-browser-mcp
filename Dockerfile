# Playwright's bundled Chromium is glibc-built and will not launch on Alpine
# (musl). We install Alpine's OS-native Chromium via apk and point Playwright at
# it through CHROMIUM_PATH (see src/session-manager.ts). PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
# stops the (useless here) bundled-browser download during npm ci.
FROM node:22-alpine AS builder
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# tini/curl for init+healthcheck; chromium + its runtime libs and fonts so the
# OS-native browser actually launches and renders text/emoji.
RUN apk add --no-cache \
      tini curl \
      chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-emoji
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV PORT=8018
# Path of the apk-installed Chromium; consumed by session-manager.ts launch opts.
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
EXPOSE 8018

HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -f http://localhost:8018/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/server.js"]
