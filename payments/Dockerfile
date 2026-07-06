FROM node:alpine

RUN apk add --no-cache ca-certificates

COPY caddy-root.crt /usr/local/share/ca-certificates/caddy.crt

RUN update-ca-certificates

ENV NODE_OPTIONS=--use-openssl-ca

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

RUN npm install -g corepack && corepack enable

RUN mkdir -p /app && chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json ./

COPY --chown=node:node yarn.lock ./

COPY --chown=node:node .npmrc ./

RUN yarn install --frozen-lockfile --production=true

COPY --chown=node:node . .

CMD ["yarn", "start"]
