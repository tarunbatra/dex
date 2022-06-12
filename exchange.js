const { v4: uuid } = require('uuid')
const debug = require('debug')('dex:exchange')
const Network = require('./network')
class Exchange {
    constructor(nodeId, network, config) {
        this.nodeId = nodeId
        this.config = config
        this.network = network
        this.orderbook = new Map()

        network.on(Network.Channels.SYNC_ORDER, (order) => {
            const orderId = order.id
            this.orderbook.set(orderId, order)
            debug('Order updated: ' + orderId)
            this.matchOrder(order, this.orderbook)
        })
    }


    getOrderbook() {
        return this.orderbook
    }

    async createOrder(type, quantity, ticker, user) {
        const order = new Order(type, quantity, ticker, user, this.nodeId)
        debug(`Creating order: ${order.id}`)
        this.orderbook.set(order.id, order)
        syncOrder(order, this.network)
        this.matchOrder(order, this.orderbook)
        return order
    }

    async cancelOrder(orderId) {
        const order = this.orderbook.get(orderId)
        if (!order) {
            return new Error(`Not Found: Order #${orderId}`)
        }
        const locked = lockOrder(order, this.network)
        if(locked) {
            order.state = Order.State.CANCELED
            await syncOrder(order, this.network)
            await unlockOrder(order, this.network)
        } else {
            throw new Error('FAILED: Order already under processing')
        }
    }

    async executeOrder(orderId1, orderId2) {
        if (!this.orderbook.has(orderId1) || !this.orderbook.has(orderId)) {
            return new Error("Not Found: Order")
        }
        const order1 = this.orderbook.get(orderId1)
        const order2 = this.orderbook.get(orderId2)

        [ lockedOrder1, lockedOrder2 ] = await Promise.all([unlockOrder(order1), unlockOrder(order2)])
        if (!lockedOrder1 || !lockedOrder2) {
            throw new Error("FAILED: Order already under processing")
        }
        await this.processTrade(order1, order2)
        this.orderbook.set(orderId1, order1)
        this.orderbook.set(orderId2, order2)
        await Promise.all([syncOrder(order1, this.network), syncOrder(order2, this.network)])
        await Promise.all([unlockOrder(order1, this.network), unlockOrder(order2. this.network)])
        return true
    }

    async matchOrder(orderToBeMatched, orderbook) {
        debug(`Matching order ${orderToBeMatched.id} against orderbook`)
        for (const anotherOrder of orderbook) {
            console.log(anotherOrder)
            // Ignore orders from the same user
            if (anotherOrder.user == orderToBeMatched.user) continue
            // Ignore orders of the same type
            if (anotherOrder.type == orderToBeMatched.type) continue
            await this.executeOrder(orderToBeMatched, anotherOrder)
            break
        }
    }

    async processTrade(one, two) {
        if (one.quantity > two.quantity) {
            one.filledQuantity = one.filledQuantity - two.quantity
            two.filledQuantity = two.quantity
            await this.createOrder(two.type, two.quantity - two.filledQuantity, two.ticker, two.usr)
        } else if (two.quantity > one.quantity) {
            two.filledQuantity = one.quantity
            one.filledQuantity = one.quantity
            await this.createOrder(one.type, one.quantity - one.filledQuantity, one.ticker, one.usr)
        } else {
            two.filledQuantity = two.quantity
            one.filledQuantity = one.quantity
        }
        two.state = Order.State.COMPLETED
        one.state = Order.State.COMPLETED
    }
}

async function syncOrder(order, network) {
    try {
        await network.broadcast(Network.Channels.SYNC_ORDER, order)
    } catch (err) {
        console.error("Error syncing orders to network", err)
    }
}

async function lockOrder(order, network) {
    try {
        await network.lock(order.id)
        return true
    } catch (err) {
        return false
    }
}

async function unlockOrder(order, network) {
    try {
        await network.unlock(order.id)
        return true
    } catch (err) {
        return false
    }
}


class Order {
    static State = {
        PENDING: 'PENDING',
        CANCELED: 'CANCELED',
        COMPLETED: 'COMPLETED',
    }

    static Type = {
        BUY: 'BUY',
        SELL: 'SELL'
    }

    constructor(type, quantity, ticker, user, nodeId) {
        this.id = generateOrderId(nodeId)
        this.type = type
        this.quantity = quantity
        this.filledQuantity = 0
        this.ticker = ticker
        this.user = user
        this.state = Order.State.PENDING
        return this
    }
}

function generateOrderId (nodeId) {
    return `${nodeId}-${uuid()}`
}

module.exports = Exchange
