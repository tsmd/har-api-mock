const fs = require('fs')
const { URL } = require('url')

function findEntry(req, entries) {
  const reqMethod = req.method.toLowerCase()
  const reqUrl = new URL(req.originalUrl, 'http://localhost')
  reqUrl.searchParams.sort()

  // パスとクエリパラメーターが完全一致するエントリーを探す
  for (const entry of entries) {
    const entryMethod = entry.request.method.toLowerCase()
    const entryUrl = new URL(entry.request.url)
    entryUrl.searchParams.sort()
    if (
      reqMethod === entryMethod &&
      reqUrl.pathname === entryUrl.pathname &&
      reqUrl.searchParams.toString() === entryUrl.searchParams.toString()
    ) {
      return entry
    }
  }

  // クエリパラメーター以外のパスが完全一致するエントリーを探す
  for (const entry of entries) {
    const entryMethod = entry.request.method.toLowerCase()
    const entryUrl = new URL(entry.request.url)
    if (reqMethod === entryMethod && reqUrl.pathname === entryUrl.pathname) {
      return entry
    }
  }
}

const defaultOptions = {
  harFile: 'data.har',
  ignoreHeaders: ['content-encoding', 'content-length', 'date', 'status', 'vary']
}

module.exports = (options = {}) => {
  options = Object.assign({}, defaultOptions, options)

  const harData = JSON.parse(fs.readFileSync(options.harFile, { encoding: 'utf8' }))

  return (req, res, next) => {
    const foundEntry = findEntry(req, harData.log.entries)
    if (!foundEntry) {
      return next()
    }

    const headers = foundEntry.response.headers.reduce((prev, curr) => {
      if (!options.ignoreHeaders.includes(curr.name.toLowerCase())) {
        prev[curr.name] = curr.value
      }
      return prev
    }, {})
    res.status(foundEntry.response.status)
    res.set(headers)

    if (foundEntry.response.content.encoding === 'base64') {
      res.send(Buffer.from(foundEntry.response.content.text, 'base64'))
    } else {
      res.send(foundEntry.response.content.text)
    }
  }
}
