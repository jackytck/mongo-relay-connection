import { GraphQLInt } from 'graphql'
import { connectionDefinitions } from 'graphql-relay'

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

export default mrType
