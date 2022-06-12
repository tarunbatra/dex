const debug = require('debug')('client')
const config = require('./config')
const Network = require('./network')
const Exchange = require('./exchange')

const network = new Network(config.nodeId, config)
const exchange = new Exchange(config.nodeId, network, config)
network.connect()
.then(() => {
  debug('DEX client initialized') 
}).catch(err => {
    debug('[ERROR]', err)
    process.exit(1)
})

process.on('uncaughtException', (err) => {
    debug('[uncaughtException]', err)
    process.exit(1)
})

process.on('SIGTERM', () => {
    network.disconnect()
    process.exit()
})

module.exports = exchange