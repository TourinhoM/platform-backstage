FROM node:22-bookworm-slim AS build

ENV PYTHON=/usr/bin/python3
ENV NODE_OPTIONS="--no-node-snapshot"

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY package.json .yarnrc.yml yarn.lock tsconfig.json backstage.json ./
COPY .yarn ./.yarn
COPY packages/app/package.json ./packages/app/
COPY packages/backend/package.json ./packages/backend/

RUN yarn install --immutable

COPY packages/app ./packages/app
COPY packages/backend/src ./packages/backend/src
COPY examples ./examples
COPY app-config.yaml ./

RUN yarn build:all

# ---- runtime ----
FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PYTHON=/usr/bin/python3
ENV NODE_OPTIONS="--no-node-snapshot"

# TechDocs local builder: instala mkdocs via pip e REMOVE o pip do final.
# pip só é necessário em build (TechDocs roda via binário mkdocs), e o
# python3-pip do Debian 12 tem CVE-2026-8643 sem fix — purgar elimina a HIGH.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip g++ build-essential && \
    apt-get install -y --no-install-recommends libgnutls30 && \
    pip3 install --no-cache-dir --break-system-packages mkdocs-techdocs-core && \
    apt-get purge -y python3-pip && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

RUN addgroup --system --gid 1001 backstage && \
    adduser --system --uid 1001 --gid 1001 backstage

WORKDIR /app

COPY --from=build --chown=backstage:backstage /app/.yarn ./.yarn
COPY --from=build --chown=backstage:backstage \
    /app/yarn.lock /app/.yarnrc.yml /app/package.json /app/backstage.json ./

COPY --from=build --chown=backstage:backstage \
    /app/packages/backend/dist/skeleton.tar.gz ./

RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN yarn workspaces focus --all --production && yarn cache clean

COPY --from=build --chown=backstage:backstage /app/examples ./examples
COPY --from=build --chown=backstage:backstage \
    /app/packages/backend/dist/bundle.tar.gz ./
COPY --chown=backstage:backstage app-config.yaml ./

RUN tar xzf bundle.tar.gz && rm bundle.tar.gz && \
    chown -R backstage:backstage /app

USER backstage

EXPOSE 7007

CMD ["node", "packages/backend/dist/index.cjs.js", "--config", "app-config.yaml"]
