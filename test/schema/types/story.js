import {
  GraphQLID,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString
} from 'graphql'

const Person = new GraphQLObjectType({
  name: 'Person',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    age: { type: GraphQLInt }
  })
})

const Story = new GraphQLObjectType({
  name: 'Story',
  fields: {
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    author: { type: Person }
  }
})

export default Story
