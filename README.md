# Tiny Nodejs
The smallest docker image with `nodejs` installed.
Works on `linux/amd64` `linux/arm64`.  
Smaller than `ghr.io/distroless/nodejs20`!!
Supports `sharp`
# How to use
```dockerfile
FROM node:slim AS builder
WORKDIR /ws
COPY . .
RUN npm install && npm run build
FROM googlefan25/tiny-node:latest
COPY --from=builder /ws/dist/bundle.js /bundle.js
CMD ["node", "bundle.js"]
```
# Building by yourself
## arm64
`docker build . --file aarch64.Dockerfile --platform linux/arm64 --tag $YOU_IMAGE_TAG_HERE`
## x86_64
`docker build . --file x86_64.Dockerfile --platform linux/amd64 --tag $YOU_IMAGE_TAG_HERE`