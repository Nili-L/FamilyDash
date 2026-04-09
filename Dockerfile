FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ src/
COPY public/ public/
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY --from=frontend /app/dist ./public

EXPOSE 3001
CMD ["node", "index.js"]
