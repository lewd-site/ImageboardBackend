FROM node:17-alpine
RUN apk add --update --no-cache ffmpeg
WORKDIR /usr/src/app
COPY . .
RUN echo 'AUTH_TOKEN=test1234' >> .env \
  && echo 'DB_PATH=db.sqlite3' >> .env \
  && echo 'HTTP_PORT=3000' >> .env \
  && echo 'RABBIT_HOST=amqp://queue:5672' >> .env
RUN yarn install \
  && yarn build
EXPOSE 3000
CMD ["yarn", "start"]
