FROM node:24-alpine AS builder

WORKDIR /app/api-ts
COPY api-ts/package*.json ./
RUN npm install
COPY api-ts/ ./
COPY database /app/database
RUN npm run build

FROM node:24-alpine
WORKDIR /app/api-ts
COPY api-ts/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/api-ts/dist ./dist
COPY --from=builder /app/database /app/database

EXPOSE 3000
CMD ["npm", "start"]
