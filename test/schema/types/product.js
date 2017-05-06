import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt
} from 'graphql'

const Product = new GraphQLObjectType({
  name: 'Product',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    price: { type: GraphQLInt }
  }
})

export default Product
