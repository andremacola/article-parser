/**
* Converts a date format to YYYY-MM-DD.
* Supported formats:
* - RFC 2822 like (e.g., "Thu, 31 Jul 2025 21:41:45 -0000")
* - "DD de MMMM de YYYY" (e.g., "13 de julho de 2025") for pt-br.
* - "MMMM DD, YYYY" (e.g., "julho 22, 2025")
* - "YYYY-MM-DD" (and full ISO 8601)
* - "DD/MM/YYYY" (for pt-br)
* - "MM/DD/YYYY" (heuristic for other languages)
*
* @param {string} dateString
* @param {string} language
* @returns {string|undefined}
*/
function convertDateFormat (dateString, language) {
  if (!dateString || typeof dateString !== 'string') {
    return undefined
  }

  // Attempt to parse RFC 2822-like formats first, as they are very specific.
  // The presence of a 3-letter month and time is a good indicator.
  if (
    dateString.match(/\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/i) &&
    dateString.match(/\d{1,2}:\d{1,2}/)
  ) {
    const d = new Date(dateString)
    if (d && !isNaN(d.getTime())) {
      return d.toISOString()
    }
  }

  const months = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
  }
  const monthNamesPattern = Object.keys(months).join('|')
  const normalizedDate = dateString.trim().toLowerCase()

  // Pattern 1: "MMMM DD, YYYY" (e.g., "julho 22, 2025")
  let match = normalizedDate.match(
    new RegExp(`^(${monthNamesPattern})\\s+(\\d{1,2}),\\s+(\\d{4})$`, 'i')
  )
  if (match) {
    const [, monthName, day, year] = match
    const month = months[monthName]
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
  }

  // Pattern 2: "DD de MMMM de YYYY" (e.g., "13 de julho de 2025")
  match = normalizedDate.match(
    new RegExp(`^(\\d{1,2})\\s+de\\s+(${monthNamesPattern})\\s+de\\s+(\\d{4})$`, 'i')
  )
  if (match) {
    const [, day, monthName, year] = match
    const month = months[monthName]
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
  }

  // Pattern 3: Slash-separated dates
  match = normalizedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (match) {
    let [, part1, part2, year] = match
    let day, month

    if (language === 'pt-br') {
      [day, month] = [part1, part2]
    } else {
      [month, day] = [part1, part2]
    }

    if (year && year.length === 2) {
      year = '20' + year
    }

    if (year && month && day) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
    }
  }

  // Pattern 4: ISO format YYYY-MM-DD with optional time/timezone
  // We check against the original trimmed string to preserve case (e.g., 'Z' for UTC).
  const trimmedDateString = dateString.trim()
  match = trimmedDateString.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/)
  if (match) {
    return trimmedDateString
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
    new RegExp( // Pattern for RFC 2822 Style
      '\\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\\s+\\d{1,2}\\s+' +
      '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)' +
      '\\s+\\d{4}\\s+\\d{2}:\\d{2}:\\d{2}\\s+[+-]?\\d{4}\\b',
      'i'
    ),
    /\d{4}-\d{2}-\d{2}/, // Pattern for "YYYY-MM-DD"
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Pattern for "DD/MM/YYYY"
    new RegExp( // Pattern for "julho 22, 2025"
      '\\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)' +
      '\\s+\\d{1,2},\\s+\\d{4}\\b',
      'i'
    ),
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
export default function (doc, metadata, options = {}) {
  const language = doc.documentElement.lang.toLowerCase() || 'en'
  const defaultPrimarySelectors = 'time, [datetime], [itemprop~=datePublished], [itemprop~=dateCreated], abbr.published'
  const primarySelectors = options.primarySelectors + ', ' + defaultPrimarySelectors || defaultPrimarySelectors
  const priorityElements = doc.querySelectorAll(primarySelectors
  )
  for (const el of priorityElements) {
    // Get a date string from the most likely attributes.
    const attrDateStr = el.getAttribute('datetime') || el.getAttribute('content') || el.getAttribute('title')

    // First, try to parse the string directly from the attributes.
    // `convertDateFormat` acts as our validator and parser for standalone date strings.
    if (attrDateStr) {
      const parsedAttrDate = convertDateFormat(attrDateStr, language)
      if (parsedAttrDate) {
        // The attribute contained a string we could understand. Use it.
        return parsedAttrDate
      }
    }

    // If attributes didn't exist or contained a format we couldn't parse,
    // fall back to searching within the visible text content of the element.
    const contentDate = dateFromContent(el, language)
    if (contentDate) {
      return contentDate
    }
  }

  const urlDate = metadata.url && dateFromUrl(metadata.url)
  if (urlDate) return urlDate

  // eslint-disable-next-line max-len
  const defaultSecondarySelectors = '.date-header, .date, .entry-date, .entry-time, .post-date, .post-time, .article-date, .article-time, .article-pubdate, .article-pubtime, .article-publishdate, .article-publishtime, .article-createdate, .article-createtime, .article-updatedate, .article-updatetime, .article-modifieddate, .article-modifiedtime, .article-publishtime'
  const secondarySelectors = options.secondarySelectors + ', ' + defaultSecondarySelectors || defaultSecondarySelectors
  const secondaryElements = doc.querySelectorAll(secondarySelectors)

  for (const el of secondaryElements) {
    const date = dateFromContent(el, options.dateLanguage || language)
    if (date) return date
  }

  return ''
}
