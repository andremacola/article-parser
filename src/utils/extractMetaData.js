// utils -> extractMetaData

import { DOMParser } from 'linkedom'
import extractLdSchema from './extractLdSchema.js'
import findDate from './findDate.js'

/**
 * @param html {string}
 * @param inputUrl {string}
 * @param options {object}
 * @returns {{image: string, author: string, amphtml: string, description: string, canonical: string, source: string, published: string, title: string, url: string, shortlink: string, favicon: string, type: string}}
 */
export default (html, inputUrl = '', options = {}) => {
  const entry = {
    url: '',
    shortlink: '',
    amphtml: '',
    canonical: '',
    title: '',
    description: '',
    image: '',
    author: '',
    source: '',
    published: '',
    favicon: '',
    type: '',
  }

  const attributeLists = {
    source: [
      'application-name',
      'og:site_name',
      'twitter:site',
      'dc.title',
    ],
    url: [
      'og:url',
      'twitter:url',
      'parsely-link',
    ],
    title: [
      'og:title',
      'twitter:title',
      'parsely-title',
      'title',
    ],
    description: [
      'og:description',
      'twitter:description',
      'parsely-description',
      'description',
    ],
    image: [
      'og:image',
      'og:image:url',
      'og:image:secure_url',
      'twitter:image',
      'twitter:image:src',
      'parsely-image-url',
      'image',
    ],
    author: [
      'author',
      'creator',
      'og:creator',
      'article:author',
      'twitter:creator',
      'dc.creator',
      'parsely-author',
    ],
    published: [
      'article:published_time',
      'article:modified_time',
      'og:updated_time',
      'dc.date',
      'dc.date.issued',
      'dc.date.created',
      'dc:created',
      'dcterms.date',
      'datepublished',
      'datemodified',
      'updated_time',
      'modified_time',
      'published_time',
      'release_date',
      'date',
      'parsely-pub-date',
    ],
    type: [
      'og:type',
    ],
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')

  Array.from(doc.getElementsByTagName('link')).forEach(node => {
    const rel = node.getAttribute('rel')
    const href = node.getAttribute('href')
    if (rel && href) {
      if (!entry[rel] || rel === 'canonical') {
        entry[rel] = href
      }
      if (rel === 'icon' || rel === 'shortcut icon') {
        entry.favicon = href
      }
    }
  })

  for (const [key, attrList] of Object.entries(attributeLists)) {
    if (entry[key]) {
      continue
    }

    for (const attr of attrList) {
      const selector = `meta[name='${attr}'], meta[property='${attr}'], meta[itemprop='${attr}']`
      const nodes = doc.querySelectorAll(selector)

      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1]
        const content = lastNode.getAttribute('content')

        if (content) {
          entry[key] = content
          break
        }
      }
    }
  }

  const metadata = extractLdSchema(doc, entry)

  if (!metadata.title) {
    metadata.title = doc.querySelector('head > title')?.innerText || ''
  }

  if (!metadata.url) {
    metadata.url = inputUrl
  }

  if (!metadata.published) {
    metadata.published = findDate(doc, metadata, options) || ''
  }

  return metadata
}
