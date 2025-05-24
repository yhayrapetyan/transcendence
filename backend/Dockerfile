FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install @fastify/static dotenv

COPY . .

RUN npx prisma generate
RUN npx prisma migrate deploy

RUN mkdir -p ./prisma/images

COPY ./src/prisma ./prisma

COPY load_secrets.sh .
RUN chmod +x load_secrets.sh

EXPOSE 3000

CMD ["node", "server.js"]
