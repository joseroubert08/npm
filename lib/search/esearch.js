'use strict'

var npm = require('../npm.js')
var log = require('npmlog')
var mapToRegistry = require('../utils/map-to-registry.js')
var jsonstream = require('JSONStream')
var ms = require('mississippi')
var zlib = require('zlib')

module.exports = esearch

function esearch (opts) {
  var stream = ms.through.obj()

  mapToRegistry('-/v1/search', npm.config, function (er, uri, auth) {
    if (er) return stream.emit('error', er)
    uri +=
    createResultStream(uri, auth, opts, function (err, resultStream) {
      if (err) return stream.emit('error', err)
      ms.pipeline.obj(resultStream, stream)
    })
  })
  return stream
}

function createResultStream (uri, auth, opts, cb) {
  log.verbose('esearch', 'creating remote entry stream')
  var params = {
    timeout: 600,
    follow: true,
    staleOk: true,
    auth: auth,
    streaming: true
  }
  var q = buildQuery(opts)
  npm.registry.request(uri + '?text=' + encodeURI(q) + '&size=' + opts.limit, params, function (er, res) {
    if (er) return cb(er)
    log.silly('esearch', 'request stream opened, code:', res.statusCode)
    // NOTE - The stream returned by `request` seems to be very persnickety
    //        and this is almost a magic incantation to get it to work.
    //        Modify how `res` is used here at your own risk.
    var entryStream = ms.pipeline.obj(
      res,
      ms.through(function (chunk, enc, cb) {
        cb(null, chunk)
      }),
      zlib.createGunzip(),
      jsonstream.parse('objects.*.package')
    )
    return cb(null, entryStream)
  })
}

function buildQuery (opts) {
  return opts.include.join(' ')
}
