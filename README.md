# mediasoup-sample-2024 deno + express + mediasoup + solidjs

## Tab to Tab Test

1. Have a Loopback passthrough device (in my case: "Hijack Audio")
2. Go to the tag from 2025-02-08
3. Run bun dev in /packages/client
4. Run bun dev in /packages/server
5. Set the default input to "Hijack Audio" (to avoid isses in audio device selection)
6. Open http://localhost:8000 for the client
7. Send and receive audio via the trpc pages

## Laptop to Phone Test

1. Have a Loopback passthrough device (in my case: "Hijack Audio")
2. Let your Laptop have a "static DHCP IP" (in my case: 192.168.8.8, with my GLINet Mobile Router)
3. Add the following Host entries here: https://192.168.8.1/cgi-bin/luci/admin/network/hosts
   1. tagungsapps.de => 192.168.8.8
   2. traefik.tagungsapps.de => 192.168.8.8
   3. translate.tagungsapps.de => 192.168.8.8
   4. translate-api.tagungsapps.de => 192.168.8.8
4. Start the dev setup

   1. Run `bun start-logs` or similar from the root package.json
      => starts the traefik reverse proxy (for https certs)
   2. Run `bun dev` in /packages/server
      => starts the server on https://translate-api.tagungsapps.de (internally localhost:4000)
   3. Run `bun dev` in /packages/client
      => starts the client on https://translate.tagungsapps.de (internally localhost:8000)

5. Set the default input to "Hijack Audio" (to avoid isses in audio device selection)
6. Open https://translate.tagungsapps.de/send-trpc on your Laptop
7. Open https://translate.tagungsapps.de/receive-trpc on your Phone
8. enjoy!

If no connction to the virtual hosts translate.tagungsapps.de:
Flush Cache: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
