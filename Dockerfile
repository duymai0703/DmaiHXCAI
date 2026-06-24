FROM node:22-bookworm AS engine-builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential ca-certificates curl make \
  && rm -rf /var/lib/apt/lists/*

COPY scripts ./scripts
COPY src ./src

WORKDIR /app/src
RUN make -j2 build ARCH=x86-64 COMP=gcc

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV PIKAFISH_ENGINE=/app/src/pikafish

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY analysis-app ./analysis-app
COPY --from=engine-builder /app/src/pikafish /app/src/pikafish
COPY --from=engine-builder /app/src/pikafish.nnue /app/src/pikafish.nnue

RUN chmod +x /app/src/pikafish

EXPOSE 8080

CMD ["npm", "run", "app"]
