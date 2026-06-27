FROM node:22-bookworm AS engine-downloader

WORKDIR /tmp/pikafish

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl p7zip-full \
  && rm -rf /var/lib/apt/lists/*

ARG PIKAFISH_RELEASE_URL=https://github.com/official-pikafish/Pikafish/releases/download/Pikafish-2026-01-02/Pikafish.2026-01-02.7z

RUN set -eux; \
  curl -fL "$PIKAFISH_RELEASE_URL" -o pikafish.7z; \
  7z x pikafish.7z Linux/pikafish-sse41-popcnt pikafish.nnue; \
  mkdir -p /engine; \
  cp Linux/pikafish-sse41-popcnt /engine/pikafish; \
  cp pikafish.nnue /engine/pikafish.nnue; \
  chmod +x /engine/pikafish

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV PIKAFISH_ENGINE=/app/src/pikafish

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libc6 libstdc++6 libgcc-s1 libgomp1 libatomic1 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev
COPY analysis-app ./analysis-app
COPY --from=engine-downloader /engine/pikafish /app/src/pikafish
COPY --from=engine-downloader /engine/pikafish.nnue /app/src/pikafish.nnue

RUN chmod +x /app/src/pikafish \
  && printf "uci\nquit\n" | /app/src/pikafish

EXPOSE 8080

CMD ["npm", "run", "app"]
