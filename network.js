'use strict'
const EventEmitter = require('events')
const { PeerRPCServer, PeerRPCClient } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')
const debug = require('debug')('dex:network')
const constants = require('./constants')
const utils = require('./utils')

class Network extends EventEmitter {

    static Channels = {
        SYNC_ORDER: 'SYNC_ORDER',
    }

    constructor(nodeId, config) {
        super()
        this.nodeId = nodeId
        this.config = config
    }

    async connect() {
        return new Promise((resolve, reject) => {
            debug("Connecting to the network using " + this.config.grenacheURI)
            this.link = new Link({
                grape: this.config.grenacheURI
            })
            this.link.start()

            this.serverPeer = new PeerRPCServer(this.link, {
                timeout: this.config.timeout
            })
            this.serverPeer.init()

            this.server = this.serverPeer.transport('server')
            this.server.listen(this.config.port)
              
            this.link.startAnnouncing(Network.Channels.SYNC_ORDER, this.server.port, {}, (err)  => {
                if (err) {
                    console.log("err", err)
                } else {
                    this.emit('ready')
                }
                debug("SERVER", `Listening for requests on ${Network.Channels.SYNC_ORDER}`)
            })

            this.server.on('request', (rid, key, payload, handler) => {
                debug("SERVER", `Request received: ${key}`)
                this.emit(Network.Channels.SYNC_ORDER, payload)
                handler.reply(null, "OK")
            })

            this.client = new PeerRPCClient(this.link, {
                timeout: this.config.timeout
            })
            this.client.init()
            return resolve()
        })
    }

    async broadcast(event, payload) {
        return new Promise((resolve, reject) => {
            debug("CLIENT", `Broadcasting ${event}:${JSON.stringify(payload)}`)
            this.client.map(event, payload, {}, (err, data) => {
                if (err && err.message !== constants.FirstNodeError) {
                    return reject(err)
                } else {
                    debug("CLIENT", "Broadcast reply", data)
                    return resolve()
                }
            })
        })
    }

    async send(event, payload) {
        return new Promise((resolve, reject) => {
            debug("CLIENT", `Sending ${event}:${payload}`)
            this.client.request(event, payload, {}, (err, data) => {
                if (err && err.message !== constants.FirstNodeError) {
                    return reject(err)
                } else {
                    return resolve(data)
                }
            })
        })
    }

    async lock(key) {
        return new Promise((resolve, reject) => {
            debug("CLIENT", `Locking ${key}`)
            const DHTKey = utils.getDhtKey(key)
            this.link.get(DHTKey, {}, (err, locked) => {
                if (err && err.message !== constants.FirstNodeError) {
                    return reject(err)
                } else if (locked) {
                    return reject(new Error("The key is already locked"))
                } else {
                    this.link.put(key, {}, (err, hash) => {
                        if (err && err.message !== constants.FirstNodeError) {
                            return reject(err)
                        } else {
                            if (DHTKey !== hash) {
                                return reject(new Error('Incompatible hashing function used by Grape DHT'))
                            }
                            return resolve(hash)
                        }
                    })            
                }
            })
        })
    }

    async unlock(key) {
        return new Promise((resolve, reject) => {
            debug("CLIENT", `Unlocking ${key}`)
            // TODO: unlocking requires deleting the lock from DHT,
            // which is not quite possible as it stands
            // needs to revisit this
            return resolve(true)
        })
    }

    async disconnect() {
        debug("Disconneting from the network")
        await this.link.stopAnnouncing(this.nodeId, this.service.port)
        await this.link.stop()
    }
}

module.exports = Network


