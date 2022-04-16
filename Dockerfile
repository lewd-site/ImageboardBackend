FROM node:17-alpine
RUN apk add --update --no-cache ffmpeg make g++ python3 postgresql libpq-dev
WORKDIR /usr/src/app
COPY . .
RUN echo 'AUTH_TOKEN=test1234' >> .env \
  && echo 'DB=pgsql' >> .env \
  && echo 'PGSQL_HOST=database' >> .env \
  && echo 'PGSQL_PORT=5432' >> .env \
  && echo 'PGSQL_DATABASE=imageboard' >> .env \
  && echo 'PGSQL_USER=imageboard' >> .env \
  && echo 'PGSQL_PASSWORD=imageboard' >> .env \
  && echo 'HTTP_PORT=3000' >> .env \
  && echo 'QUEUE=rabbit' >> .env \
  && echo 'RABBIT_HOST=amqp://queue:5672' >> .env
RUN yarn install \
  && yarn build
EXPOSE 3000
CMD ["yarn", "start"]
