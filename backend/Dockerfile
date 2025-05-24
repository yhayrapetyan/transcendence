FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install @fastify/static dotenv

COPY . .

COPY ./src/prisma ./prisma

RUN npx prisma generate
RUN npx prisma migrate deploy

RUN mkdir -p ./prisma/images

EXPOSE 3000

CMD ["node", "./src/server.js"]
