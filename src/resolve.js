import _last from 'lodash/last'
import isEmpty from 'lodash/isEmpty'
import isNumber from 'lodash/isNumber'
import leaf from './leaf'
import mrDefaultFromCursor from './defaultFromCursor'
import mrDefaultToCursor from './defaultToCursor'
import reverse from 'lodash/reverse'

/**
 * Query and resolve according to the pagination algorithm.
 * ref: https://facebook.github.io/relay/graphql/connections.htm#sec-Pagination-algorithm
 * @param {object} args Arguments from parent value.
 * @param {object} model Mongoose model
 * @param {object} query Mongo query to get all documents.
 * @param {string} cursorField Unique field used in sorting and constructing the cursor.
 * @param {number} direction 1 to sort ascendingly, -1 to sort decendingly.
 * @param {string} populate Mongoose field(s) to be populated.
 * note: if both first and last are given, then last is ignored
 */
async function mrResolve (args, model, query = {}, { cursorField = '_id', direction = 1, toCursor = mrDefaultToCursor, fromCursor = mrDefaultFromCursor, mapNode = x => x, populate = '' } = {}) {
  if (!isNumber(direction)) {
    direction = 1
  }
  const { after, first, before } = args
  let last = args.last

  // if both first and last are given, last is ignored
  if (first && last) {
    last = null
  }

  let sort = {
    [cursorField]: direction
  }

  let idSort = 1
  if (cursorField === '_id') {
    idSort = direction
  }

  let afterQuery = {}
  let beforeQuery = {}

  if (after) {
    const { field, id } = fromCursor(after)
    // Let afterEdge be the edge in edges whose cursor is equal to the after argument.
    // if field is found, if it is unique, then count is 1, otherwise larger than 1.
    const afterEdgeCount = await model.countDocuments({ ...query, [cursorField]: field })

    // Remove all elements of edges before and including afterEdge.
    if (direction === 1) {
      afterQuery[cursorField] = { $gt: field }
    } else {
      afterQuery[cursorField] = { $lt: field }
    }

    // non unique case, need to fetch back the tie-ing docs too
    if (afterEdgeCount > 1) {
      const tie = {
        // ...query,
        [cursorField]: field,
        _id: { $gt: id }
      }
      afterQuery = { $or: [tie, afterQuery] }
    }
  }

  if (before) {
    const { field, id } = fromCursor(before)
    // Let beforeEdge be the edge in edges whose cursor is equal to the before argument.
    const beforeEdgeCount = await model.countDocuments({ ...query, [cursorField]: field })
    // Remove all elements of edges after and including beforeEdge.
    if (direction === 1) {
      beforeQuery[cursorField] = { $lt: field }
    } else {
      beforeQuery[cursorField] = { $gt: field }
    }

    if (beforeEdgeCount > 1) {
      const tie = {
        // ...query,
        [cursorField]: field,
        _id: { $lt: id }
      }
      beforeQuery = { $or: [tie, beforeQuery] }
    }
  }

  // in case cursorField is not unique
  const multiSort = [[cursorField, sort[cursorField]], ['_id', idSort]]
  if (last) {
    multiSort[0][1] = direction * -1
    multiSort[1][1] = -1
  }

  const joinQuery = [
    query,
    afterQuery,
    beforeQuery
  ].filter(x => !isEmpty(x))

  let finalQuery = {}
  if (joinQuery.length > 1) {
    finalQuery = { $and: joinQuery }
  } else if (joinQuery.length === 1) {
    finalQuery = joinQuery[0]
  }

  if (first && first < 0) {
    throw new Error(`first(${first}) could not be negative`)
  }

  if (last && last < 0) {
    throw new Error(`last(${last}) could not be negative`)
  }
  const limit = first || last

  // special optimization:
  // if limit (from first or last) is specified,
  // then edgesCount could be limited by a bigger number than limit,
  // instead of counting all docs, to infer if more pages is available.
  let cntLimit
  if (limit) {
    cntLimit = limit + 1
  }
  const [nodes, totalCount, edgesCount] = await Promise.all([
    model.find(finalQuery).limit(limit).sort(multiSort).populate(populate),
    model.find(query).countDocuments(),
    model.find(finalQuery).limit(cntLimit).countDocuments()
  ])
  let edges = nodes.map(node => {
    return {
      node: mapNode(node),
      cursor: toCursor(leaf(node, cursorField), node.id)
    }
  })
  if (last) {
    edges = reverse(edges)
  }

  let hasPreviousPage = false
  if (last && edgesCount > last) {
    hasPreviousPage = true
  }

  let hasNextPage = false
  if (first && edgesCount > first) {
    hasNextPage = true
  }

  let startCursor = ''
  let endCursor = ''
  if (edges.length > 0) {
    startCursor = edges[0].cursor
    endCursor = _last(edges).cursor
  }

  const pageInfo = {
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor
  }

  return {
    pageInfo,
    edges,
    totalCount
  }
}

export default mrResolve
