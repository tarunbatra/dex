const bencode = require('bencode')
const simpleSha1 = require('simple-sha1')

module.exports = {
    getDhtKey(data) {
        return sha1(bencode.encode(Buffer.from(data))).toString('hex')
    }
}

function sha1 (buf) {
    return Buffer.from(simpleSha1.sync(buf), 'hex')
}