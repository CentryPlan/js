#!/bin/bash

set -e

cp -r ../lib-http-proposer-api lib-http-proposer-api

if ! docker images | grep gryadka_clients; then
  docker build -t="gryadka_clients" .
fi

docker run -i --name=gryadka_clients \
  --network=example_gryadkanet \
  -t gryadka_clients

docker rm gryadka_clients

rm -rf lib-http-proposer-api