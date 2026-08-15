# Backend (Express API + webhook)
FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
