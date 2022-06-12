const dex = require('../')
const { setTimeout } = require('timers/promises')
dex.network.on('ready', async () => {
    await setTimeout(3000)
    const order = await dex.createOrder('BUY', 1, 'BTC', 'xyz.eth')
    await setTimeout(5000)
    console.log(dex.getOrderbook())
})

