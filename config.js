'use strict'

require('dotenv').config()

module.exports = {
    grenacheURI: process.env.GRENACHE_URI || 'http://127.0.0.1:30001',
    timeout: parseInt(process.env.TIMEOUT) || 20000,
    port: 1024 + Math.floor(Math.random() * 1000),
    nodeId: process.NODE_ID || process.pid,
}
