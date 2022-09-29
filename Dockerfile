# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker

FROM node:lts-buster@sha256:5968f50bda8ea8bdc65fd4208de287bbb25ca3ba81649494b1b6cf4b9203695e

WORKDIR /app
# EXPOSE 8080 
# Internal port moved to 8000

COPY . .
RUN npm ci 
CMD ["npm", "start"] 
