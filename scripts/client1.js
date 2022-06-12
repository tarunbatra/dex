const exchange = require('../')
const { setTimeout } = require('timers/promises')
exchange.network.on('ready', async () => {
    await setTimeout(3000)
    const order = await exchange.createOrder('BUY', 1, 'BTC', 'xyz.eth')
    await setTimeout(5000)
    console.log(exchange.getOrderbook())
})

