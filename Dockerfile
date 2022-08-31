# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker

FROM node:lts-buster@sha256:10c88537539012bd30777e41fdd30b30d088abb6dfc995f77ace26071052d4d1

WORKDIR /app
# EXPOSE 8080 
# Internal port moved to 8000

COPY . .
RUN npm ci 
CMD ["npm", "start"] 
