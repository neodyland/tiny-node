username = googlefan25
amd64-image = $(username)/amd64-tiny-node
arm64-image = $(username)/arm64-tiny-node
image = $(username)/tiny-node

build-arm:
	docker build . --file aarch64.Dockerfile --platform linux/arm64 --tag $(arm64-image)

build-amd:
	docker build . --file x86_64.Dockerfile --platform linux/amd64 --tag $(amd64-image)

build-cross:
	make build-arm
	make build-amd

build-manifest:
	docker manifest create $(image):latest $(amd64-image):latest $(arm64-image):latest

push:
	docker manifest push $(image)

build:
	make build-cross
	make build-manifest

build-push:
	make push

test:
	docker run -it --rm ubuntu:latest bash