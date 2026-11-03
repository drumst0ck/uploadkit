# Tiny cron container — runs supercronic to hit the api service cron
# endpoints on a schedule. Keeps scheduling concerns out of the api
# process itself, restart-safe, logs to stdout.
FROM alpine:3.21@sha256:ee16d92f96db08d9d2d07da48555a27f3a69d8f0759021dbc601195ed0d2b5bd

ARG TARGETARCH
ENV SUPERCRONIC_VERSION=v0.2.33

# curl is used by the cron commands, tini reaps zombies, ca-certs for TLS
# Checksums are the SHA-256 of the v0.2.33 release assets (the SHA-1 values
# published in the GitHub release notes were verified to match these files).
RUN apk add --no-cache curl ca-certificates tini \
  && ARCH="${TARGETARCH:-amd64}" \
  && case "$ARCH" in \
       amd64) SUPERCRONIC_SHA256=feefa310da569c81b99e1027b86b27b51e6ee9ab647747b49099645120cfc671 ;; \
       arm64) SUPERCRONIC_SHA256=f1f8585c66de020fef494dd636058f99949d108f569fef00016a1c8b9eb145b3 ;; \
       *) echo "unsupported arch: $ARCH" >&2; exit 1 ;; \
     esac \
  && wget -qO /usr/local/bin/supercronic \
       "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-${ARCH}" \
  && echo "${SUPERCRONIC_SHA256}  /usr/local/bin/supercronic" | sha256sum -c - \
  && chmod +x /usr/local/bin/supercronic

COPY docker/cron/crontab /etc/supercronic/crontab

# Run as non-root
USER nobody

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep supercronic >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# -passthrough-logs: let cron job stdout/stderr flow to container logs
# -quiet: supercronic itself stays quiet so logs aren't drowned out
CMD ["supercronic", "-passthrough-logs", "-quiet", "/etc/supercronic/crontab"]
