var ms = require('mississippi')
var allPackageMetadata = require('./all-package-metadata')
var packageFilter = require('./package-filter.js')

module.exports = allPackageSearch
function allPackageSearch (opts) {
  var searchSection = (opts.unicode ? '🤔 ' : '') + 'search'

  // Get a stream with *all* the packages. This takes care of dealing
  // with the local cache as well, but that's an internal detail.
  var allEntriesStream = allPackageMetadata(opts.staleness)

  // Grab a stream that filters those packages according to given params.
  var filterStream = streamFilter(function (pkg) {
    opts.log.gauge.pulse('search')
    opts.log.gauge.show({section: searchSection, logline: 'scanning ' + pkg.name})
    // Simply 'true' if the package matches search parameters.
    var match = packageFilter(pkg, opts.include, opts.exclude, {
      description: opts.description
    })
    return match
  })
  return ms.pipeline.obj(allEntriesStream, filterStream)
}

function streamFilter (filter) {
  return ms.through.obj(function (chunk, enc, cb) {
    if (filter(chunk)) {
      this.push(chunk)
    }
    cb()
  })
}
