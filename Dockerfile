# syntax=docker/dockerfile:1

#https://stackoverflow.com/a/10544510
#https://github.com/apache/couchdb-docker
FROM node:lts-buster@sha256:59eb4e9d6a344ae1161e7d6d8af831cb50713cc631889a5a8c2d438d6ec6aa0f
ARG REACT_APP_HOST_NAME
ARG REACT_APP_LOCAL_COUCHDB_HOST
ARG REACT_APP_LOCAL_COUCHDB_USERNAME
ARG REACT_APP_LOCAL_COUCHDB_PASSWORD
ARG REACT_APP_LOCAL_COUCHDB_PORT
ARG REACT_APP_FAIMS_REQUIRED_GROUP
ARG REACT_APP_FAIMS_USERDB
# These are runtime vars, I don't think we need them here
ARG FAIMS_CONDUCTOR_KID
ARG FAIMS_CONDUCTOR_PRIVATE_KEY_PATH
ARG FAIMS_CONDUCTOR_PUBLIC_KEY_PATH
ARG FAIMS_CONDUCTOR_INSTANCE_NAME
ARG FAIMS_REQUIRED_GROUP
ARG FAIMS_USERDB
ENV NODE_ENV=production
WORKDIR /app
EXPOSE 8080
VOLUME ["/app/keys"]
COPY . .
RUN npm ci
RUN npm run compile
#RUN keymanagement/makeTestKeys.sh 
#VOLUME exposes the dir to the outside, but is static... 
CMD ["node", "."]
#RUN npm run start DOES NOT WORK
#RUN curl -X PUT http://127.0.0.1:5984/_users
#RUN curl -X PUT http://127.0.0.1:5984/_replicator
#RUN curl -X PUT http://127.0.0.1:5984/_global_changes
#RUN echo $REACT_APP_DIRECTORY_HOST
#RUN sleep 1
#RUN bash initDockerDb.sh https $REACT_APP_DIRECTORY_HOST 443 admin GlacialTrickleUnmovingTributeAwrySquishy
