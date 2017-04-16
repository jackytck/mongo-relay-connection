import {
  GraphQLInt
} from 'graphql'
import {
  connectionArgs,
  connectionDefinitions
} from 'graphql-relay'
import {
  isNumber,
  reverse,
  last as _last,
  has
} from 'lodash'
import base64 from 'base-64'

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

function defaultToCursor (field, id) {
  const m = { field, id }
  return base64.encode(JSON.stringify(m))
}

function defaultFromCursor (cursor) {
  try {
    return JSON.parse(base64.decode(cursor))
  } catch (e) {
    return {}
  }
}

/**
 * Query and resolve according to the pagination algorithm.
 * ref: https://facebook.github.io/relay/graphql/connections.htm#sec-Pagination-algorithm
 * note: Due to mongo 'limit' query, { before + first } is treated the same as { before + last }
 * @param {object} args Arguments from parent value.
 * @param {object} model Mongoose model
 * @param {object} query Mongo query to get all documents.
 * @param {string} cursorField Unique field used in sorting and constructing the cursor.
 * @param {number} direction 1 to sort ascendingly, -1 to sort decendingly.
 */
async function mrResolve (args, model, query = {}, { cursorField = '_id', direction = 1, toCursor = defaultToCursor, fromCursor = defaultFromCursor, mapNode = x => x } = {}) {
  if (!isNumber(direction)) {
    direction = 1
  }
  const { after, first, before, last } = args

  let sort = {
    [cursorField]: direction
  }

  let range = {...query}
  let tie = null
  let idSort = 1
  let toReverse = false

  if (after) {
    const { field, id } = fromCursor(after)
    // Let afterEdge be the edge in edges whose cursor is equal to the after argument.
    // if field is found, if it is unique, then count is 1, otherwise larger than 1.
    const afterEdgeCount = await model.count({ ...query, [cursorField]: field })
    if (afterEdgeCount !== 0) {
      // Remove all elements of edges before and including afterEdge.
      if (direction === 1) {
        range[cursorField] = { $gt: field }
      } else {
        range[cursorField] = { $lt: field }
      }
    }

    // non unique case, need to fetch back the tie-ing docs too
    if (afterEdgeCount > 1) {
      tie = {
        ...query,
        [cursorField]: field,
        _id: { $gt: id }
      }
    }
  }

  if (before) {
    const { field, id } = fromCursor(before)
    // Let beforeEdge be the edge in edges whose cursor is equal to the before argument.
    const beforeEdgeCount = await model.count({ ...query, [cursorField]: field })
    if (beforeEdgeCount !== 0) {
      // Remove all elements of edges after and including beforeEdge.
      if (direction === 1) {
        range[cursorField] = { $lt: field }
        sort[cursorField] = -1
      } else {
        range[cursorField] = { $gt: field }
        sort[cursorField] = 1
      }

      if (beforeEdgeCount > 1) {
        tie = {
          ...query,
          [cursorField]: field,
          _id: { $lt: id }
        }
      }
      idSort = -1
      toReverse = true
    }
  }

  // in case cursorField is not unique
  const multiSort = [[cursorField, sort[cursorField]], ['_id', idSort]]
  let multiQuery = tie ? { $or: [tie, range] } : range

  // check if cursorField has already been appeared in original query
  if (has(query, cursorField)) {
    const original = {
      [cursorField]: query[cursorField]
    }
    multiQuery = {
      $and: [
        original,
        multiQuery
      ]
    }
  }
  // console.log(JSON.stringify(multiQuery, null, 2))

  if (first && first < 0) {
    throw new Error(`first(${first}) could not be negative`)
  }

  if (last && last < 0) {
    throw new Error(`last(${last}) could not be negative`)
  }
  const limit = first || last
  const nodes = await model.find(multiQuery).limit(limit).sort(multiSort)
  // todo: append missing nodes
  let edges = nodes.map(node => {
    return {
      node: mapNode(node),
      cursor: toCursor(node[cursorField], node.id)
    }
  })
  if (toReverse) {
    edges = reverse(edges)
  }

  const edgesCount = await model.find(range).count()

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
  mrDateToCursor,
  mrDateFromCursor,
  mrResolve
}
