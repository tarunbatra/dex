# Decentralized Exchange (DEX)


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
- The clients should, on the first run, request the existing distributed order book. They do not do that now.
- The clients use the [Bittorrent DHT hashing algorithm](./utils.js#L5) to relize a distributed locking which is not ideal.
- The clients do not handle race condition well due to missing mutex unlocking. See more [here](./network.js#L109).
- The order matching code does not consider price. So the exchange does not support LIMIT orders.
- The clients sometimes have issues broadcasting to each other, I am not sure why, could be race condition due to using the smae name to announce. Need moe time to study the Grenache lib.
