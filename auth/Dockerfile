FROM ahsan2882/node-with-caddy-ca:latest

WORKDIR /app

COPY package.json ./

COPY .npmrc ./

RUN npm install --omit=dev

COPY . .

CMD ["npm", "start"]
