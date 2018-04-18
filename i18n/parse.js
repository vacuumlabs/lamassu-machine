const fs = require('fs')
const path = require('path')

const _ = require('lodash/fp')
const Xray = require('x-ray')
const x = Xray({
  filters: {strip}
})

const uiPath = path.resolve(__dirname, '..', 'ui')
const startPath = path.resolve(uiPath, 'start.html')
const html = fs.readFileSync(startPath, {encoding: 'utf8'})

function strip (s) {
  return s.trim().replace(/[\n ]+/g, ' ')
}

function parseAppLine (line) {
  const re = /locale\.translate\(["'](.+)["']\)/
  const res = line.match(re)
  return res && res[1]
}

function parseJs (s) {
  const lines = s.split('\n')
  const results = _.uniq(_.compact(_.map(parseAppLine, lines)))
  return results
}

function parseHtml (s) {
  return new Promise((resolve, reject) => {
    const stream = x(html, '.viewport', [{
      screen: '@data-tr-section',
      str: ['.js-i18n | strip']
    }]).stream()

    stream.on('data', data => resolve(JSON.parse(data.toString())))
    stream.on('error', err => reject(err))
  })
}

const appPath = path.resolve(uiPath, 'src', 'app.js')
const app = fs.readFileSync(appPath, {encoding: 'utf8'})

const pp = require('../lib/pp')

parseHtml(html)
  .then(htmlResults => {
    const appResults = parseJs(app)
    htmlResults.push({screen: 'dynamic', str: appResults})
    pp()(htmlResults)
  })
