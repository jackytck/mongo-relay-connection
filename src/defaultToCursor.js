import base64 from 'base-64'
import utf8 from 'utf8'

/**
 * Default helper function for mapping object to cursor.
 */
function mrDefaultToCursor (field, id) {
  const m = { field, id }
  return base64.encode(utf8.encode(JSON.stringify(m)))
}

export default mrDefaultToCursor
