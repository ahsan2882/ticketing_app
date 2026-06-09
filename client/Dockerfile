FROM node:alpine

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN chown -R nextjs:nodejs /app

USER nextjs

CMD ["npm", "run", "dev"]
