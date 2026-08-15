# Dashboard (Next.js standalone)
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
# Next nests standalone under dashboard/ when it infers the parent as workspace root
COPY --from=build /app/.next/standalone/dashboard ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
