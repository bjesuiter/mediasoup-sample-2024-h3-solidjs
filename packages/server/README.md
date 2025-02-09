# server

## Certs

- use /assets/dev_cert as dtlsCertificateFile and dtlsPrivateKeyFile

## For Debugging:

Compare Sample Implementation with my own: https://github.com/versatica/mediasoup-demo/blob/v3/server/server.js

## How to use the `bun metrics` script

Instructions: https://docs.deno.com/runtime/fundamentals/open_telemetry/#quick-start

1. Run `bun metrics` to start the simple LGTM stack with docker (remember to start orbstack or docker runtime)
2. Run `bun dev` to start the server
3. You can then access the Grafana dashboard at http://localhost:3000 with the username admin and password admin.

## How to write custom metrics for the open telemetry stack

Instructions: https://docs.deno.com/runtime/fundamentals/open_telemetry/#user-metrics
