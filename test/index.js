import 'babel-polyfill'
import assert from 'assert'
import { graphql } from 'graphql'
import {
  sortBy,
  pick
} from 'lodash'
import { expect } from 'chai'
import Starship from './models/starship'
import schema from './schema/schema'
import starshipsJSON from './data/starships.json'

const ref = sortBy(starshipsJSON.data.allStarships.edges, x => x.node.starshipClass)

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
})

describe('edges', () => {
  it('should fetch all the nodes in proper order', async () => {
    const query = `
      {
        allStarships {
          edges {
            node {
              model
              starshipClass
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allStarships
    expect(edges).to.deep.equal(ref)
  })
})

describe('transverse forward', () => {
  it('should tranverse forward via page info cursor', async () => {
    const query = (first, after) => {
      return `
        {
          allStarships(first: ${first}, after: "${after}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              node {
                model
                starshipClass
              }
            }
          }
        }
      `
    }

    const query1 = query(1, '')
    let res = await graphql(schema, query1)
    let { pageInfo, edges } = res.data.allStarships
    let { hasNextPage, endCursor } = pageInfo
    assert(hasNextPage)
    assert(endCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(0, 1))

    const query2 = query(10, endCursor)
    res = await graphql(schema, query2)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(1, 11))

    const query3 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(11, 21))

    const query4 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(21, 31))

    const query5 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasNextPage)
    assert(pageInfo.startCursor)
    assert(pageInfo.endCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(31))

    const query6 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasNextPage)
    assert(!pageInfo.startCursor)
    assert(!pageInfo.endCursor)
    expect(edges.length).to.equal(0)
  })
})

describe('transverse backward', () => {
  it('should tranverse backward via page info cursor', async () => {
    const query = before => {
      return `
        {
          allStarships(last: 10, before: "${before}") {
            pageInfo {
              hasPreviousPage
              startCursor
            }
            edges {
              node {
                model
                starshipClass
              }
            }
          }
        }
      `
    }

    const query1 = `
      {
        allStarships {
          pageInfo {
            endCursor
          }
        }
      }
    `
    let res = await graphql(schema, query1)
    let { endCursor } = res.data.allStarships.pageInfo
    assert(endCursor)

    const query2 = query(endCursor)
    res = await graphql(schema, query2)
    let { pageInfo, edges } = res.data.allStarships
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(25, 35))

    const query3 = query(pageInfo.startCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(15, 25))

    const query4 = query(pageInfo.startCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(5, 15))

    const query5 = query(pageInfo.startCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(0, 5))

    const query6 = query(pageInfo.startCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allStarships.pageInfo
    assert(!pageInfo.hasPreviousPage)
    assert(!pageInfo.startCursor)
  })
})

describe('first', () => {
  it('should fetch the first n items after the cursor', async () => {
    const n = 3

    const query = after => {
      return `
        {
          allStarships (first: ${n}, after: "${after}") {
            edges {
              node {
                model
                starshipClass
              }
              cursor
            }
          }
        }
      `
    }

    const res = await graphql(schema, query(''))
    const { edges } = res.data.allStarships
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(0, n))

    const res2 = await graphql(schema, query(edges[n - 1].cursor))
    const edges2 = res2.data.allStarships.edges
    expect(edges2.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(n, n * 2))
  })
})

describe('first + after on non-unique field', () => {
  it('should fetch the first n items after the cursor', async () => {
    const query = (first, after) => {
      return `
        {
          allStarships (first: ${first}, after: "${after}") {
            edges {
              node {
                model
                starshipClass
              }
              cursor
            }
          }
        }
      `
    }

    const res = await graphql(schema, query(16, ''))
    const { edges } = res.data.allStarships

    const res2 = await graphql(schema, query(3, edges[15].cursor))
    const edges2 = res2.data.allStarships.edges
    expect(edges2.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(16, 19))
  })
})

describe('last + before on non-unique field', () => {
  it('should fetch the last n items before the cursor', async () => {
    const pageQuery = `
      {
        allStarships (first: 30) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allStarships.pageInfo

    const query = `
      {
        allStarships (last: 6, before: "${endCursor}") {
          edges {
            node {
              model
              starshipClass
            }
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allStarships
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(ref.slice(23, 29))
  })
})
