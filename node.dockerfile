FROM node:20

COPY dist /var/www

WORKDIR /var/www

COPY src/shared/services/assets/* shared/services/assets/
COPY src/shared/services/email/templates/* shared/services/email/templates/

COPY package.json .

EXPOSE 3333

ENV NODE_ENV=$NODE_ENV

RUN yarn add sharp --ignore-engines

RUN yarn

CMD ./node_modules/pm2/bin/pm2-runtime main.js --name vcnafacul
