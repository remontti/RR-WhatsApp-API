FROM node:lts-alpine

RUN apk update && \
    apk add chromium \ 
    && rm -rf /var/cache/apk/*
WORKDIR /usr/app
COPY . . 
RUN npm install
EXPOSE 3001 8080

CMD ["node", "./index.js"]