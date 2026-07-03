FROM node:alpine

RUN apk add --no-cache ca-certificates

COPY caddy-root.crt /usr/local/share/ca-certificates/caddy.crt

RUN update-ca-certificates

ENV NODE_OPTIONS=--use-openssl-ca

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

WORKDIR /app

RUN npm install -g corepack && corepack enable

COPY package.json ./

COPY yarn.lock ./

COPY .npmrc ./

RUN yarn install --frozen-lockfile --production=true

COPY . .

CMD ["yarn", "start"]
