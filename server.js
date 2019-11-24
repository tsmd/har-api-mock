const express = require('express')
const fs = require('fs')
const { URL } = require('url')
const args = require('minimist')(process.argv)

const harFile = args.harfile || 'data.har'
const harData = JSON.parse(fs.readFileSync(harFile, { encoding: 'utf8' }))

const port = args.port || 3210
const hostname = args.hostname || 'localhost'

const ignoreHeaders = ['content-length', 'date', 'status']

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

const server = express()

server.all('*', (req, res) => {
  const foundEntry = findEntry(req, harData.log.entries)
  if (!foundEntry) {
    res.sendStatus(404)
    return
  }

  const headers = foundEntry.response.headers.reduce((prev, curr) => {
    if (!ignoreHeaders.includes(curr.name.toLowerCase())) {
      prev[curr.name] = curr.value
    }
    return prev
  }, {})
  res.status(foundEntry.response.status)
  res.set(headers)
  res.send(foundEntry.response.content.text)
})

server.set('x-powered-by', false)
server.listen(port, hostname)
