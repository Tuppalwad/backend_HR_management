# syntax=docker/dockerfile:1

# ---------- builder: full toolchain, used only to generate the Prisma client ----------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

# Full install (incl. devDependencies) — the `prisma` CLI is needed for `prisma generate`.
# The cache mount lives on the BUILD HOST, not in the image: rebuilds reuse the downloaded
# tarballs (fast) while the ~500MB cache never becomes a layer. This is why no `yarn cache
# clean` is needed here — there is nothing baked in to clean.
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install

COPY prisma ./prisma
COPY prisma.config.ts ./

# Emits ./generated/prisma, which the app requires at runtime. It is gitignored, so it does
# not exist in the build context and MUST be produced here.
RUN npx prisma generate


# ---------- deps: production-only dependency tree ----------
FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

# --production drops `nodemon`. The yarn cache is a build-host cache mount rather than a layer,
# so the ~500MB of tarballs never enters the image and rebuilds stay fast. The prune below must
# happen in THIS layer — a later `rm` cannot shrink an earlier one.
#
# The `prisma` CLI survives --production regardless of it being a devDependency, because
# @prisma/client declares it as a peerDependency ("prisma": "*"). It drags in the whole
# developer toolchain, none of which the running server loads: the app requires only
# ./generated/prisma, @prisma/client (-> @prisma/client-runtime-utils) and
# @prisma/adapter-mariadb (-> mariadb, @prisma/driver-adapter-utils). Everything removed below
# is reachable only from the CLI, Studio's React/D3 UI, or the pglite dev server (Postgres
# compiled to WASM — for a MySQL-only app). Migrations are run from the builder stage or the
# deploy host, never from this image.
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install --production \
    && cd node_modules \
    && rm -rf prisma \
              @prisma/studio-core @prisma/dev @prisma/config \
              @prisma/query-plan-executor @prisma/streams-local \
              @electric-sql effect elkjs react-dom remeda \
              @radix-ui @visx d3-array d3-shape @types fast-check


# ---------- runtime: only what the app actually executes ----------
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# User is created before any COPY so ownership can be set inline. A `chown -R` afterwards
# would rewrite every file into a second copy of the whole tree, roughly doubling the image.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --chown=appuser:appgroup --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/generated ./generated
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 3030

CMD ["node", "/app/bin/www"]
