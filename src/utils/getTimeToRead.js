// utils -> getTimeToRead

import {
  stripTags,
} from 'bellajs';

import {
  getParserOptions,
} from '../config';

const {wordsPerMinute} = getParserOptions();

export default (content) => {
  const text = stripTags(content);
  const words = text.trim().split(/\s+/g).length;
  const minToRead = words / wordsPerMinute;
  const secToRead = Math.ceil(minToRead * 60);
  return secToRead;
};

