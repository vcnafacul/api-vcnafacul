FROM node:16

COPY dist /var/www

WORKDIR /var/www

EXPOSE 3333

ENV NODE_ENV=$NODE_ENV

RUN yarn

CMD ./node_modules/pm2/bin/pm2-runtime main.js --name vcnafacul
