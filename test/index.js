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
    assert(!hasNextPage)
    assert(!hasPreviousPage)
    assert(startCursor)
    assert(endCursor)
  })

  it('should tranverse forward via page info cursor', async () => {
    const query = after => {
      return `
        {
          allStarships(first: 10, after: "${after}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `
    }
    const query1 = query('')
    let res = await graphql(schema, query1)
    let { pageInfo } = res.data.allStarships
    let { hasNextPage, endCursor } = pageInfo
    assert(hasNextPage)
    assert(endCursor)

    const query2 = query(endCursor)
    res = await graphql(schema, query2)
    pageInfo = res.data.allStarships.pageInfo
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)

    const query3 = query(pageInfo.endCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allStarships.pageInfo
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)

    const query4 = query(pageInfo.endCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allStarships.pageInfo
    assert(!pageInfo.hasNextPage)
    assert(pageInfo.endCursor)

    const query5 = query(pageInfo.endCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allStarships.pageInfo
    assert(!pageInfo.hasNextPage)
    assert(!pageInfo.startCursor)
    assert(!pageInfo.endCursor)
  })
})
