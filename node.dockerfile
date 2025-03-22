FROM node:20.18.2-alpine

COPY dist /var/www

WORKDIR /var/www

COPY src/shared/services/assets/* shared/services/assets/
COPY src/shared/services/email/templates/* shared/services/email/templates/

COPY package.json .
COPY yarn.lock .

EXPOSE 3333

ENV NODE_ENV=$NODE_ENV

RUN yarn add sharp --ignore-engines && yarn install --production && yarn cache clean

CMD ./node_modules/pm2/bin/pm2-runtime main.js --name vcnafacul
