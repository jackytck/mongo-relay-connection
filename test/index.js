import 'babel-polyfill'
import assert from 'assert'
import { graphql } from 'graphql'
import Starship from './models/starship'
import schema from './schema/schema'

describe('mongo data', () => {
  it('should fetch correct number of starships from mongo', async () => {
    const cnt = await Starship.count()
    assert(cnt === 36)
  })
})

describe('totalCount', () => {
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

describe('pageInfo', () => {
  it('should fetch correct page info', async () => {
    const query = `
      {
        allStarships {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { pageInfo } = res.data.allStarships
    const { hasNextPage, hasPreviousPage, startCursor, endCursor } = pageInfo
    assert(hasNextPage === false)
    assert(hasPreviousPage === false)
    assert(startCursor)
    assert(endCursor)
  })
})
