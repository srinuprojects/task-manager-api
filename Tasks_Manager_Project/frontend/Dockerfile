# ---- build stage: compile the React app into static files ----
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage: Caddy serves the files and proxies /api ----
FROM caddy:2-alpine

COPY --from=build /app/dist /srv
