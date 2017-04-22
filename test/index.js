import 'babel-polyfill'
import assert from 'assert'
import { graphql } from 'graphql'
import Starship from './models/starship'
import schema from './schema/schema'

describe('mongo test', () => {
  it('should fetch correct number of starships from mongo', async () => {
    const cnt = await Starship.count()
    assert(cnt === 36)
  })
})

describe('query totalCount', () => {
  it('should fetch correct total count', async () => {
    const query = `
      {
        allStarships {
          totalCount
        }
      }
    `
    const res = await graphql(schema, query)
    assert(res.data.allStarships.totalCount === 36)
  })
})
