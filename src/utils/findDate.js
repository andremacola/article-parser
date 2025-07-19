/**
* Converts a date format to YYYY-MM-DD.
* Supported formats:
* - "DD de MMMM de YYYY" (e.g., "13 de julho de 2025") for pt-br.
* - "YYYY-MM-DD"
* - "DD/MM/YYYY" (for pt-br)
* - "MM/DD/YYYY" (heuristic for other languages)
*
* @param {string} dateString
* @param {string} language
* @returns {string|undefined}
*/
function convertDateFormat (dateString, language) {
  // Try parsing pt-br long format first, as it's very specific.
  if (dateString.includes(' de ')) {
    const months = {
      'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
      'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
      'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
    }
    const parts = dateString.toLowerCase().split(' de ')
    if (parts.length === 3) {
      const day = parts[0]
      const monthName = parts[1]
      const year = parts[2]
      const month = months[monthName]

      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
      }
    }
  }

  // Handle slash-separated dates
  if (dateString.includes('/')) {
    const parts = dateString.split('/')
    if (parts.length === 3) {
      let year, month, day

      if (language === 'pt-br') {
        [day, month, year] = parts
      } else {
        [month, day, year] = parts
      }

      if (year && year.length === 2) {
        year = '20' + year
      }

      if (year && month && day) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
      }
    }
  }

  // Handle ISO format YYYY-MM-DD
  if (dateString.includes('-')) {
    const parts = dateString.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${dateString}T00:00:00`
    }
  }

  return undefined
}

/**
* @param {string} url
* @returns {string|undefined}
*/
function dateFromUrl (url) {
  const regex = /\/(\d{4})\/(\d{2})\/(\d{2})(?:[^\d]|$)/
  const match = url.match(regex)

  if (match) {
    // eslint-disable-next-line no-unused-vars
    const [_, year, month, day] = match
    const dateString = `${year}-${month}-${day}T00:00:00`

    // date validation
    const date = new Date(dateString)
    if (date.getFullYear() === parseInt(year) &&
    date.getMonth() + 1 === parseInt(month) &&
    date.getDate() === parseInt(day)) {
      return dateString
    }
  }

  return undefined
}

/**
* @param {Element} element
* @param {string} language
* @returns {string|undefined}
*/
function dateFromContent (element, language) {
  const datePatterns = [
    /\d{4}-\d{2}-\d{2}/, // Pattern for "YYYY-MM-DD"
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Pattern for "DD/MM/YYYY"
    new RegExp(
      '\\b\\d{1,2}\\s+de\\s+' +
        '(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)' +
        '\\s+de\\s+\\d{4}\\b',
      'i'
    ), // Pattern for "13 de julho de 2025". It can be preceded by the day of the week.
  ]

  for (const pattern of datePatterns) {
    const match = element.textContent.match(pattern)
    if (match) {
      return convertDateFormat(match[0], language)
    }
  }

  return undefined
}

/**
* Look for publication date in the body of the content.
*
* @param {Document} document - HTML Document
* @param {Object} metadata - Article metadata
* @returns {string} Date string
*/
export default function (doc, metadata) {
  const language = doc.documentElement.lang.toLowerCase() || 'en'
  const priorityElements = doc.querySelectorAll(`
    time,
    [datetime],
    [itemprop~=datePublished],
    [itemprop~=dateCreated],
    abbr.published`
  )
  for (const el of priorityElements) {
    const date =
          el.getAttribute('datetime')
       || el.getAttribute('content')
       || el.getAttribute('title')
       || dateFromContent(el, language)
    if (date) return date
  }

  const urlDate = dateFromUrl(metadata.url)
  if (urlDate) return urlDate

  // eslint-disable-next-line max-len
  const secondaryElements = doc.querySelectorAll('.date-header, .date, .entry-date, .entry-time, .post-date, .post-time, .article-date, .article-time, .article-pubdate, .article-pubtime, .article-publishdate, .article-publishtime, .article-createdate, .article-createtime, .article-updatedate, .article-updatetime, .article-modifieddate, .article-modifiedtime, .article-publishtime')

  for (const el of secondaryElements) {
    const date = dateFromContent(el, language)
    if (date) return date
  }

  return ''
}
