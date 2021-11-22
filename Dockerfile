# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker
FROM node:lts-buster@sha256:ca24d3d8d30987e0ff4b6c2e72fb7d1d487e6cfd8f2d0ecda84f53d3e95f1831
ARG REACT_APP_HOST_NAME
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 8080
COPY . .
RUN npm ci
RUN npm run compile
RUN keymanagement/makeTestKeys.sh 
RUN bash echo $REACT_APP_HOST_NAME
VOLUME ["/keys"]
#VOLUME exposes the dir to the outside, but is static... 
CMD ["node", "."]
#RUN npm run start DOES NOT WORK
#RUN curl -X PUT http://127.0.0.1:5984/_users
#RUN curl -X PUT http://127.0.0.1:5984/_replicator
#RUN curl -X PUT http://127.0.0.1:5984/_global_changes
#RUN echo $REACT_APP_DIRECTORY_HOST
#RUN sleep 1
#RUN bash initDockerDb.sh https $REACT_APP_DIRECTORY_HOST 443 admin GlacialTrickleUnmovingTributeAwrySquishy
