# Next.js 15 storefront — local development image.
# Runs `next dev --turbopack -p 8000` with source bind-mounted for hot reload.
# Dev mode reads NEXT_PUBLIC_* live at startup, so no build-time env bake.
FROM node:20-slim

WORKDIR /app

# Install the whole workspace from the single root lockfile. Copy every
# workspace package.json so npm can resolve the workspace graph, then `npm ci`.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
RUN npm ci

# App source (overlaid by a bind mount at runtime — see docker-compose.yml).
COPY apps/storefront apps/storefront

EXPOSE 8000

CMD ["npm", "run", "dev", "-w", "@dtc/storefront"]
