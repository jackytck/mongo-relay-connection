import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString
} from 'graphql'

const Starship = new GraphQLObjectType({
  name: 'Starship',
  fields: {
    id: { type: GraphQLID },
    model: { type: GraphQLString },
    starshipClass: { type: GraphQLString }
  }
})

export default Starship
