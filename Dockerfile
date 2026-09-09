FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

# --- deps ---
FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=false
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src ./src
EXPOSE 3000
CMD ["sh", "-c", "yarn payload migrate && yarn start"]
