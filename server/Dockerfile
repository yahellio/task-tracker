FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 UPLOADS_DIR=/app/uploads
EXPOSE 3000

CMD ["node", "src/main.js"]
