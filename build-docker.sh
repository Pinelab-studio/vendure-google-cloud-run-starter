#!/bin/bash

# format to use:
# ./build-docker.sh your-project

docker build -t eu.gcr.io/$1/vendure .
# Configure docker to use Google authentication
gcloud auth configure-docker -q
docker push eu.gcr.io/$1/vendure
