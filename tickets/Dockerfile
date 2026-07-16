FROM node:alpine

RUN mkdir -p /app && chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json ./

COPY --chown=node:node common.tgz ./

RUN npm install --omit=dev

COPY --chown=node:node . .

CMD ["npm", "start"]
