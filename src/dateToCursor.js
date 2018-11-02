import base64 from 'base-64'

/**
 * Sample model to / form cursors functions.
 */
function mrDateToCursor (date, id) {
  const m = {
    id,
    field: date.toISOString()
  }
  return base64.encode(JSON.stringify(m))
}

export default mrDateToCursor
