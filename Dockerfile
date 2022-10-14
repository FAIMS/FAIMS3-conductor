# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker

FROM node:lts-buster@sha256:6d592fdb89fccdeb880d14f30bf139b8a755f33b376f025b70e50ac5547c8ccf

WORKDIR /app
# EXPOSE 8080 
# Internal port moved to 8000

COPY . .
RUN npm ci 
CMD ["npm", "start"] 
