import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString
} from 'graphql'

const Product = new GraphQLObjectType({
  name: 'Product',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    price: { type: GraphQLString }
  }
})

export default Product
