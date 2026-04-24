FROM node:22-alpine

WORKDIR /app

COPY package.json ./

# Remove workspace dependency - it's already bundled into dist/app.js
RUN sed -i '/"@espoa\/database"/d' package.json && npm install --omit=dev

COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/app.js"]
