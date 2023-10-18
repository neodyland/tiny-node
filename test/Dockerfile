FROM node:slim AS builder
WORKDIR /ws
COPY . .
RUN npm install
RUN npm run prod-build
FROM googlefan25/amd64-tiny-node:latest
COPY --from=builder /ws/dist /app
COPY --from=builder /ws/assets /app/assets
WORKDIR /app
EXPOSE 3000
CMD ["node", "bundle.js"]