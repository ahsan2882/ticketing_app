FROM node:alpine

RUN npm install -g corepack && corepack enable

RUN mkdir -p /app && chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json ./

COPY --chown=node:node yarn.lock ./

COPY --chown=node:node .npmrc ./

RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

CMD ["yarn", "dev"]
