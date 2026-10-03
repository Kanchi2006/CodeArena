FROM node:22-bookworm

WORKDIR /app

RUN sed -i 's/ bookworm-updates//g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y \
        python3 \
        gcc \
        g++ \
        openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "server.js"]