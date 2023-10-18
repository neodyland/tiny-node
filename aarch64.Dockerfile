FROM --platform=linux/arm64 debian:bookworm AS base
FROM --platform=linux/arm64 gcr.io/distroless/nodejs20 AS nodebin
FROM --platform=linux/arm64 scratch
COPY --from=base /lib/aarch64-linux-gnu/libdl.so.2 /lib/aarch64-linux-gnu/libdl.so.2
COPY --from=base /lib/aarch64-linux-gnu/libstdc++.so.6 /lib/aarch64-linux-gnu/libstdc++.so.6
COPY --from=base /lib/aarch64-linux-gnu/libm.so.6 /lib/aarch64-linux-gnu/libm.so.6
COPY --from=base /lib/aarch64-linux-gnu/libgcc_s.so.1 /lib/aarch64-linux-gnu/libgcc_s.so.1
COPY --from=base /lib/aarch64-linux-gnu/libpthread.so.0 /lib/aarch64-linux-gnu/libpthread.so.0
COPY --from=base /lib/aarch64-linux-gnu/libc.so.6 /lib/aarch64-linux-gnu/libc.so.6
COPY --from=base /lib/aarch64-linux-gnu/librt.so.1 /lib/aarch64-linux-gnu/librt.so.1
COPY --from=base /lib/ld-linux-aarch64.so.1 /lib/ld-linux-aarch64.so.1
# Sharp support
COPY --from=base /lib/aarch64-linux-gnu/libresolv.so.2 /lib/aarch64-linux-gnu/libresolv.so.2
COPY --from=nodebin /nodejs/bin/node /bin/node
CMD ["node"]