import {
  GraphQLObjectType
} from 'graphql'
import {
  mrType,
  mrArgs,
  mrResolve
} from '../../../src'
import Starship from './starship'
import StarshipModel from '../../models/starship'
import Product from './product'
import ProductModel from '../../models/product'
import foodTypes from '../../data/foodTypes.json'

const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
    allStarships: {
      type: mrType('Starships', Starship),
      args: mrArgs,
      resolve (parentValue, args) {
        const opts = {
          cursorField: 'starshipClass'
        }
        return mrResolve(args, StarshipModel, {}, opts)
      }
    },
    allFoodProducts: {
      type: mrType('FoodProduct', Product),
      args: mrArgs,
      resolve (parentValue, args) {
        const query = {
          type: { $in: foodTypes }
        }
        const opts = {
          cursorField: 'price',
          direction: -1
        }
        return mrResolve(args, ProductModel, query, opts)
      }
    }
  }
})

export default RootQuery
