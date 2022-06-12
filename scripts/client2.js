const dex = require('../')
const { setTimeout } = require('timers/promises')
dex.network.on('ready', async () => {
    await setTimeout(2000)
    const order = await dex.createOrder('SELL', 1, 'BTC', 'abc.eth')
    await setTimeout(5000)
    console.log(dex.getOrderbook())
})
