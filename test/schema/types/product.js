import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat
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

const ProductPrice = new GraphQLObjectType({
  name: 'ProductPrice',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    type: { type: GraphQLString },
    usd: { type: GraphQLFloat },
    euro: { type: GraphQLFloat },
    yen: { type: GraphQLFloat }
  }
})

export {
  Product,
  ProductPrice
}
