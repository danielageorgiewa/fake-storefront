# Medusa v2 backend — local development image.
# Runs `medusa develop` with source bind-mounted for hot reload.
# NOT a production image (no `medusa build` / .medusa/server).
FROM node:20-slim

# Build tools for any native deps that need node-gyp.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the whole workspace from the single root lockfile. Copy every
# workspace package.json so npm can resolve the workspace graph, then `npm ci`.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
RUN npm ci

# App source (overlaid by a bind mount at runtime — see docker-compose.yml).
COPY apps/backend apps/backend

# Migrations run on startup via the entrypoint, then CMD launches the dev server.
COPY apps/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "-w", "@dtc/backend"]
