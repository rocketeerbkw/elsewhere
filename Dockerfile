FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY index.html ./
COPY src ./src

# Vite embeds these public URLs into the client bundle at build time.
ARG VITE_GEOCODER_URL
ARG VITE_ROUTER_URL
RUN npm run build

FROM uselagoon/nginx:latest

COPY --from=builder /app/dist/ /app/
