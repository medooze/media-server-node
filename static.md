# How to compile with exteranal static libs

First go to `media-server` dir and modify the `config.ml` file to add the location of the external dependencies:

```
LOG		  = yes
DEBUG 		  = no
SANITIZE          = no
STATIC		  = yes
STATIC_OPENSSL	  = yes
STATIC_LIBSRTP	  = yes
STATIC_LIBMP4	  = yes
OPENSSL_DIR	  = /usr/local/src/openssl-1.1.0g/
LIBSRTP_DIR	  = /usr/local/src/libsrtp/
LIBMP4_DIR	  = /usr/local/src/mp4v2/
VADWEBRTC	  = yes
SRCDIR		  = /usr/local/src/medooze/media-server-node/media-server
IMAGEMAGICK       = no
```

And create the `libmediaserver.a` static lib:

```
make -j 16 libmediaserver
```

Now export an `LIBMEDIAMIXER` enviroment variable with all the static libraries needed for creating the node native add on:

``` 
export LIBMEDIAMIXER="/usr/local/src/medooze/mcu/bin/release/libmediaserver.a /usr/local/src/openssl-1.1.0g/libssl.a /usr/local/src/openssl-1.1.0g/libcrypto.a /usr/local/src/libsrtp/libsrtp2.a /usr/local/src/mp4v2/.libs/libmp4v2.a"
```

Now just configure and build as normal:
```
npm run-script dist
```

## Dependencies

- libsrtp2
- openssl 1.1.0
- libmp4v2 (from: https://github.com/medooze/mp4v2)



