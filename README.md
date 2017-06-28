node-amqp10-transport-browser-ws
========================

Provides a Websocket implementation for the transport layer for node-amqp10 intended to be used in the Browser.

**NB: node-amqp10 doesnt work in the browser out of the box so there are some modifications/removals needed in order to make it work.**
I've hacked my way around it in my fork of [node-amqp10](https://github.com/ninio/node-amqp10)

The [amqp10](http://github.com/noodlefrenzy/node-amqp10/) library exports a `TransportProvider` class that is used to manage and inject new transports for the library to use.
Each transport should expose a `register` method that takes the `TransportProvider` as an argument, allowing any transport to register a new protocol to be used.

In the present case the protocols registered are `wss` and `ws` (webocket transport using the native browser WebSocket implementation).

# Usage

```js
var amqp10 = require('amqp10');
var wsTransport = require('amqp10-transport-ws');

wsTransport.register(amqp10.TransportProvider);
```

Once registered, any URI starting with `wss://` or `ws://` given to the `connect` method of `amqp10.Client` will be handled by the websocket transport.

