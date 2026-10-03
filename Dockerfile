# Stage 1: Build the Express API
FROM node:24-alpine AS api-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Stage 2: Build the dashboard
FROM node:24-alpine AS dashboard-build
WORKDIR /dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ .
ENV VITE_API_URL=""
RUN npm run build

# Stage 3: Production runtime
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=api-build /app/dist ./dist
COPY --from=dashboard-build /dashboard/dist ./dashboard-dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
