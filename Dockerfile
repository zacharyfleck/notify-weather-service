FROM node:26-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build && rm -rf src/ tsconfig.json package-lock.json

FROM gcr.io/distroless/nodejs26-debian13 AS runner
WORKDIR /app
COPY --from=builder /app .
CMD ["dist/index.js"]
