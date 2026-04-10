# Tiny cron container — runs supercronic to hit the api service cron
# endpoints on a schedule. Keeps scheduling concerns out of the api
# process itself, restart-safe, logs to stdout.
FROM alpine:3.20

ARG TARGETARCH
ENV SUPERCRONIC_VERSION=v0.2.33

# curl is used by the cron commands, tini reaps zombies, ca-certs for TLS
RUN apk add --no-cache curl ca-certificates tini \
  && ARCH="${TARGETARCH:-amd64}" \
  && wget -qO /usr/local/bin/supercronic \
       "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-${ARCH}" \
  && chmod +x /usr/local/bin/supercronic

COPY docker/cron/crontab /etc/supercronic/crontab

# Run as non-root
USER nobody

ENTRYPOINT ["/sbin/tini", "--"]
# -passthrough-logs: let cron job stdout/stderr flow to container logs
# -quiet: supercronic itself stays quiet so logs aren't drowned out
CMD ["supercronic", "-passthrough-logs", "-quiet", "/etc/supercronic/crontab"]
