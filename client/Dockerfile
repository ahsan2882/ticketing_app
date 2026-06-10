FROM node:alpine

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

WORKDIR /app

COPY --chown=nextjs:nodejs package.json ./

RUN npm install

COPY --chown=nextjs:nodejs . .

USER nextjs

CMD ["npm", "run", "dev"]
