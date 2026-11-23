FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       ca-certificates \
       git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# patch-package runs in postinstall, so patches must exist before npm ci.
COPY patches ./patches

RUN npm ci --no-audit --no-fund

COPY . .

ENV NODE_ENV=production

RUN ffmpeg -version | head -n 1 \
    && node --version

CMD ["npm", "start"]
