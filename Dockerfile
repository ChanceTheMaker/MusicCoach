FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN node scripts/build-public.mjs && mkdir -p /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=8798 CONFIG_DIR=/data
EXPOSE 8798
CMD ["sh","-c","node db/seed.mjs && node start.mjs"]
