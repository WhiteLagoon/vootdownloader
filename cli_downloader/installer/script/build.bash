#!/bin/bash

git clone --depth 1 git://source.ffmpeg.org/ffmpeg

./ffmpeg/configure --enable-openssl
make
make install