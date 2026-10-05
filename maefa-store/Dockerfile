# Image de production de Maefa Store : le site compilé est servi par le serveur Node.js (Express).
# Construction : docker build -t maefa-store .
# Lancement    : docker compose up   (voir docker-compose.yml)

# 1. Compilation du site (React + TypeScript → fichiers statiques)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci
COPY . .
RUN npm run build

# 2. Image finale : uniquement le serveur et le site compilé
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATA_DIR=/data PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY --from=build /app/dist ./dist
# Les données (commandes, demandes, comptes) vivent dans un volume, hors de l'image
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8787
USER node
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8787/api/health || exit 1
CMD ["node", "server/index.js"]
