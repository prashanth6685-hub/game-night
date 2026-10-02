# Game Night — multi-stage Docker build (mirrors the kitchen-qr-app pattern).
FROM node:22-slim AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm install --no-audit --no-fund
COPY client/ ./client/
COPY shared/ ./shared/
RUN cd client && npm run build

FROM node:22-slim AS server-build
WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --no-audit --no-fund
COPY server/ ./server/
COPY shared/ ./shared/
RUN cd server && npm run build

# Runtime: single bundled server.js (express included) + static client.
FROM node:22-slim
WORKDIR /app
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist
WORKDIR /app/server
ENV PORT=10000
EXPOSE 10000
CMD ["node", "dist/server.js"]
