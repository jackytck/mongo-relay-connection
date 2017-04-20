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
    }
  }
})

export default RootQuery
