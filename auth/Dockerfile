FROM node:alpine

RUN apk add --no-cache ca-certificates

COPY caddy-root.crt /usr/local/share/ca-certificates/caddy.crt

RUN update-ca-certificates

ENV NODE_OPTIONS=--use-openssl-ca

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

WORKDIR /app

COPY package.json ./

COPY .npmrc ./

RUN npm install --omit=dev

COPY . .

CMD ["npm", "start"]
