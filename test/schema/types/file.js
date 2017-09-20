import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt
} from 'graphql'

const stats = new GraphQLObjectType({
  name: 'FileStats',
  fields: () => ({
    size: { type: GraphQLInt }
  })
})

const File = new GraphQLObjectType({
  name: 'File',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    stats: { type: stats }
  }
})

export default File
