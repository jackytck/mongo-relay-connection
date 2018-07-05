import {
  last as _last,
  isEmpty,
  isNumber,
  reverse
} from 'lodash'
import {
  connectionArgs,
  connectionDefinitions
} from 'graphql-relay'

import {
  GraphQLInt
} from 'graphql'
import base64 from 'base-64'
import utf8 from 'utf8'

/**
 * Create a type called `${name}Connection`.
 * @param {string} name Prefix name of connection.
 * @param {object} nodeType GraphQLObjectType of the underlying node.
 */
function mrType (name, nodeType) {
  const { connectionType } = connectionDefinitions({
    name,
    nodeType,
    connectionFields: {
      totalCount: {
        type: GraphQLInt,
        resolve: conn => conn.totalCount
      }
    }
  })
  return connectionType
}

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

function mrDateFromCursor (cursor) {
  const { field, id } = JSON.parse(base64.decode(cursor))
  return {
    id,
    field: new Date(field)
  }
}

function mrDefaultToCursor (field, id) {
  const m = { field, id }
  return base64.encode(utf8.encode(JSON.stringify(m)))
}

function mrDefaultFromCursor (cursor) {
  try {
    return JSON.parse(utf8.decode(base64.decode(cursor)))
  } catch (e) {
    return {}
  }
}

function leaf (object, path) {
  return path.split('.').reduce((value, key) => value[key], object)
}

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
    const afterEdgeCount = await model.count({ ...query, [cursorField]: field })

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
    const beforeEdgeCount = await model.count({ ...query, [cursorField]: field })
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
  const nodes = await model.find(finalQuery).limit(limit).sort(multiSort).populate(populate)
  let edges = nodes.map(node => {
    return {
      node: mapNode(node),
      cursor: toCursor(leaf(node, cursorField), node.id)
    }
  })
  if (last) {
    edges = reverse(edges)
  }

  const edgesCount = await model.find(finalQuery).count()

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
    totalCount: model.find(query).count()
  }
}

export {
  mrType,
  connectionArgs as mrArgs,
  mrDefaultToCursor,
  mrDefaultFromCursor,
  mrDateToCursor,
  mrDateFromCursor,
  mrResolve
}
