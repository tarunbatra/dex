'use strict'

require('dotenv').config()

module.exports = {
    grenacheURI: process.env.GRENACHE_URI || 'http://127.0.0.1:30001',
    timeout: process.env.TIMEOUT || 20000,
    port: process.env.PORT || 3000,
    nodeId: process.NODE_ID || process.pid,
}
