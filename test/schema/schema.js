import {
  GraphQLSchema
} from 'graphql'
import query from './types/query'

const Schema = new GraphQLSchema({
  query
})

export default Schema
