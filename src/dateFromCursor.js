import base64 from 'base-64'

/**
 * Helper function for mapping cursor to date.
 */
function mrDateFromCursor (cursor) {
  const { field, id } = JSON.parse(base64.decode(cursor))
  return {
    id,
    field: new Date(field)
  }
}

export default mrDateFromCursor
