# FAIMS3-conductor
The server-side of FAIMS3 handling authentication and authorization

* "If you run npm start, and go to 8080, you should get a html page"

```bash
$ docker volume create key-vol 
# OR
$ mkdir /tmp/keys
$ docker build -t faims3:conductor .
$ docker rm -f conductor && docker run -it -p 8080:8080 -d --name conductor --mount type=volume,source=key-vol,target=/app faims3:conductor
# flattened file 
$ docker run -it --name=test --volumes-from conductor ubuntu
$ ls /app/rsa_2048_public_key.pem.flattened
```