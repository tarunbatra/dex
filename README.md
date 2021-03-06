# Decentralized Exchange (DEX)

The decentralized exchange is created using [Grenache](https://github.com/bitfinexcom/grenache).
It has two distinct layers:
- [__Network layer__](./network.js): Responsible for interacting with DHT and peers
- [__Exchange layer__](./exchange.js): encodes functionality of the exchange

## Setup

### Setting up the DHT
```
npm i -g grenache-grape
```

```
# boot two grape servers

grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```

### Install dependencies
```
npm i
```

## Running

### Run first client
```sh
npm run client1
```

### Run second client
```sh
npm run client2
```


## TODOs

### Initialization
- The clients should, on the first run, request the existing distributed order book. They do not do that now.

### Race condition
- The clients use the [Bittorrent DHT hashing algorithm](./utils.js#L5) to relize a distributed locking which is not ideal.
- The clients do not handle race condition well due to missing mutex unlocking. See more [here](./network.js#L109).

### Price of trades
- The order matching code does not consider price. So the exchange does not support LIMIT orders.
