# FAIMS3-conductor
The server-side of FAIMS3 handling authentication and authorization

* "If you run npm start, and go to 8080, you should get a html page"

```bash
$ docker volume create key-vol 
# OR
$ mkdir /tmp/keys
$ docker build -t faims3/conductor .
$ docker run -it --name conductor --mount type=
```