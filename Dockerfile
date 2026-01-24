FROM node:25-alpine AS build

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run db:generate

RUN npm run build
RUN npm prune --omit=dev 

FROM node:25-alpine AS deploy

ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="Merlin's Crystal Ball" \
      org.opencontainers.image.description="A project to allow users to upload their Character Sheets so a DM can view them easily." \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/NinePiece2/Merlins-Crystal-Ball" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/data ./data
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/lib/db/migrations ./src/lib/db/migrations

EXPOSE 3000
CMD ["sh", "-c", "node scripts/init-db.js && npm start"]