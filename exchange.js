/**
 * Represents the functioning of the exchange
 * including methods to create, caancel, match orders
 * using the network layer
 */

const { v4: uuid } = require('uuid')
const debug = require('debug')('dex:exchange')
const Network = require('./network')
class Exchange {
    constructor(nodeId, network, config) {
        this.nodeId = nodeId
        this.config = config
        this.network = network
        this.orderbook = new Map()

        // Update orderbook on message from peers
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
        const order = {
            id: generateOrderId(this.nodeId),
            type: type,
            quantity: quantity,
            ticker: ticker,
            user: user,
            state: 'PENDING'
        }
        debug(`Creating order: ${order.id}`)
        this.orderbook.set(order.id, order)
        await syncOrder(order, this.network)
        await this.matchOrder(order, this.orderbook)
        return order
    }

    async cancelOrder(orderId) {
        const order = this.orderbook.get(orderId)
        if (!order) {
            return new Error(`Not Found: Order #${orderId}`)
        }
        // Locking the order is required before changing its state
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
        debug(`Executing orders:${orderId1}, ${orderId2}`)
        if (!this.orderbook.has(orderId1) || !this.orderbook.has(orderId2)) {
            return new Error("Not Found: Order")
        }
        const order1 = this.orderbook.get(orderId1)
        const order2 = this.orderbook.get(orderId2)

        // Locking the order is required before changing its state
        const [lockedOrder1, lockedOrder2] = await Promise.all([
            lockOrder(order1, this.network),
            lockOrder(order2, this.network)
        ])
        if (!lockedOrder1 || !lockedOrder2) {
            throw new Error("FAILED: Order already under processing")
        }
        await this.processTrade(order1, order2)
        this.orderbook.set(orderId1, order1)
        this.orderbook.set(orderId2, order2)
        await Promise.all([
            syncOrder(order1, this.network),
            syncOrder(order2, this.network)
        ])
        // TODO: Check for errors here
        await Promise.all([
            unlockOrder(order1, this.network),
            unlockOrder(order2, this.network)
        ])
        return true
    }

    async matchOrder(orderToBeMatched, orderbook) {
        for (const [_, anotherOrder] of orderbook) {
            // Ignore non pending orders
            if (anotherOrder.state !== Order.State.PENDING) continue
            // Ignore orders from the same user
            if (anotherOrder.user === orderToBeMatched.user) continue
            // Ignore orders of the same type
            if (anotherOrder.type === orderToBeMatched.type) continue
            // Ignore orders which are not for the same ticker
            if (anotherOrder.ticker !== orderToBeMatched.ticker) continue
            return await this.executeOrder(orderToBeMatched.id, anotherOrder.id)
        }
    }

    async processTrade(one, two) {
        if (one.quantity > two.quantity) {
            one.filledQuantity = one.filledQuantity - two.quantity
            two.filledQuantity = two.quantity
            // Create order for the reamining quantity and complete this order
            await this.createOrder(two.type, two.quantity - two.filledQuantity, two.ticker, two.usr)
        } else if (two.quantity > one.quantity) {
            two.filledQuantity = one.quantity
            one.filledQuantity = one.quantity
            // Create order for the reamining quantity and complete this order
            await this.createOrder(one.type, one.quantity - one.filledQuantity, one.ticker, one.usr)
        } else {
            two.filledQuantity = two.quantity
            one.filledQuantity = one.quantity
        }
        // Mark both the orders completed
        two.state = Order.State.COMPLETED
        one.state = Order.State.COMPLETED
    }
}

async function syncOrder(order, network) {
    try {
        await network.broadcast(Network.Channels.SYNC_ORDER, order)
    } catch (err) {
        debug("Error syncing orders to network", err)
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
