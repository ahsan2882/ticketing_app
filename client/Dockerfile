FROM node:alpine

RUN mkdir -p /app && chown node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package.json ./

RUN npm install

COPY --chown=node:node . .

CMD ["npm", "run", "dev"]
