# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker
FROM node:lts-buster@sha256:ca24d3d8d30987e0ff4b6c2e72fb7d1d487e6cfd8f2d0ecda84f53d3e95f1831
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install -g typescript
RUN npm ci --only=production
#RUN npm install
#ARG REACT_APP_DIRECTORY_HOST
#RUN mkdir -p /etc/keys/
#COPY local.ini /opt/couchdb/etc/local.d/from-docker-install.ini
COPY . .
EXPOSE 8080
#VOLUME ["/etc/keys/"]
#RUN bin/makeTestKeys.sh
#CMD [ "npm", "ci"]
#CMD [ "npm", "run", "start"]
#RUN npm ci
RUN keymanagement/makeTestKeys.sh 
CMD ["node", "."]
#RUN npm run start DOES NOT WORK
#RUN curl -X PUT http://127.0.0.1:5984/_users
#RUN curl -X PUT http://127.0.0.1:5984/_replicator
#RUN curl -X PUT http://127.0.0.1:5984/_global_changes
#RUN echo $REACT_APP_DIRECTORY_HOST
#RUN sleep 1
#RUN bash initDockerDb.sh https $REACT_APP_DIRECTORY_HOST 443 admin GlacialTrickleUnmovingTributeAwrySquishy