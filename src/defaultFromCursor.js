import base64 from 'base-64'
import utf8 from 'utf8'

function mrDefaultFromCursor (cursor) {
  try {
    return JSON.parse(utf8.decode(base64.decode(cursor)))
  } catch (e) {
    return {}
  }
}

export default mrDefaultFromCursor
