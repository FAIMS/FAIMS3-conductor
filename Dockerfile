# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker

FROM node:lts-buster@sha256:6155ff062c403e99c1da7c317710c5c838c1e060f526d98baea6ee921ca61729

WORKDIR /app
EXPOSE 8080 
COPY . .
RUN npm ci 
CMD ["npm", "start"] 
