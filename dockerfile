# syntax=docker/dockerfile:1

# ---------- builder: full toolchain, used only to generate the Prisma client ----------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

# Full install — the `prisma` CLI is needed for `prisma generate` below.
# The cache mount lives on the build host, so the ~500MB yarn cache never becomes an image layer.
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

# `prisma` survives --production as a peerDependency of @prisma/client and drags in Studio,
# pglite and the rest of the CLI toolchain; the server only needs the generated client and the
# mariadb adapter. Prune in THIS layer — a later `rm` cannot shrink an earlier one.
# Consequence: migrations cannot run from this image. See DEPLOYMENT.md, step 5.
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
