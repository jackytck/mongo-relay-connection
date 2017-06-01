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
import {
  Product,
  ProductPrice
} from './product'
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
    nanDirection: {
      type: mrType('nanDirection', Starship),
      args: mrArgs,
      resolve (parentValue, args) {
        const opts = {
          cursorField: 'starshipClass',
          direction: 'quantum mechanics'
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
    },
    allNonFoodProducts: {
      type: mrType('NonFoodProduct', ProductPrice),
      args: mrArgs,
      resolve (parentValue, args) {
        const query = {
          type: { $nin: foodTypes }
        }
        const format = p => +p.toFixed(2)
        const opts = {
          cursorField: 'price',
          direction: -1,
          mapNode: x => {
            return {
              name: x.name,
              type: x.type,
              usd: format(x.price / 7.78),
              euro: format(x.price / 8.71),
              yen: format(x.price * 14.36)
            }
          }
        }
        return mrResolve(args, ProductModel, query, opts)
      }
    }
  }
})

export default RootQuery
