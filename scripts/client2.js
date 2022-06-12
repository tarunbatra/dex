const exchange = require('../')
const { setTimeout } = require('timers/promises')
exchange.network.on('ready', async () => {
    await setTimeout(4000)
    const order = await exchange.createOrder('SELL', 1, 'BTC', 'abc.eth')
    await setTimeout(5000)
    console.log(exchange.getOrderbook())
}