import 'babel-polyfill'
import assert from 'assert'
import { graphql } from 'graphql'
import {
  sortBy,
  pick
} from 'lodash'
import mongoose from 'mongoose'
import { expect } from 'chai'
import Starship from './models/starship'
import Product from './models/product'
import schema from './schema/schema'
import starshipsJSON from './data/starships.json'
import foodTypes from './data/foodTypes.json'
import productsJSON from './data/products.json'
import {
  mrDefaultToCursor,
  mrDefaultFromCursor,
  mrDateToCursor,
  mrDateFromCursor
} from '../src'

const starshipsRef = sortBy(starshipsJSON.data.allStarships.edges, x => x.node.starshipClass)
const foodRef = sortBy(productsJSON.filter(x => foodTypes.indexOf(x.type) > -1), x => -x.price)
const nonFoodRef = sortBy(productsJSON.filter(x => foodTypes.indexOf(x.type) === -1), x => -x.price).map(x => {
  const format = p => +p.toFixed(2)
  return {
    name: x.name,
    type: x.type,
    usd: format(x.price / 7.78),
    euro: format(x.price / 8.71),
    yen: format(x.price * 14.36)
  }
})
// console.log(JSON.stringify(starshipsRef, null, 2))
// console.log(JSON.stringify(foodRef, null, 2))
// console.log(JSON.stringify(nonFoodRef, null, 2))

describe('mongo data', () => {
  it('should fetch correct number of starships from mongo', async () => {
    const cnt = await Starship.count()
    assert(cnt === 36)
  })

  it('should fetch correct number of products from mongo', async () => {
    const cnt = await Product.count()
    assert(cnt === 300)
  })

  it('should fetch correct number of food products from mongo', async () => {
    const cnt = await Product.count({
      type: { $in: foodTypes }
    })
    assert(cnt === 102)
  })
})

describe('totalCount', () => {
  it('should fetch correct total counts', async () => {
    const query = `
      {
        allStarships {
          totalCount
        }
        allFoodProducts {
          totalCount
        }
      }
    `
    const res = await graphql(schema, query)
    const { allStarships, allFoodProducts } = res.data
    expect(allStarships.totalCount).to.equal(36)
    expect(allFoodProducts.totalCount).to.equal(102)
  })
})

describe('pageInfo', () => {
  it('should fetch non-null page info', async () => {
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
        allFoodProducts {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `
    const expectNonNull = pageInfo => {
      const { hasNextPage, hasPreviousPage, startCursor, endCursor } = pageInfo
      assert(!hasNextPage)
      assert(!hasPreviousPage)
      assert(startCursor)
      assert(endCursor)
    }
    const res = await graphql(schema, query)
    expectNonNull(res.data.allStarships.pageInfo)
    expectNonNull(res.data.allFoodProducts.pageInfo)
  })
})

describe('all edges', () => {
  it('should fetch all nodes in proper sort order', async () => {
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
        allFoodProducts {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { allStarships, allFoodProducts } = res.data
    expect(allStarships.edges).to.deep.equal(starshipsRef)
    expect(allFoodProducts.edges.map(x => x.node)).to.deep.equal(foodRef)
  })
})

describe('transverse forward', () => {
  it('should tranverse forward via page info cursor for all starships', async () => {
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
    expect(edges).to.deep.equal(starshipsRef.slice(0, 1))

    const query2 = query(10, endCursor)
    res = await graphql(schema, query2)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(1, 11))

    const query3 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(11, 21))

    const query4 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(21, 31))

    const query5 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasNextPage)
    assert(pageInfo.startCursor)
    assert(pageInfo.endCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(31))

    const query6 = query(10, pageInfo.endCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasNextPage)
    assert(!pageInfo.startCursor)
    assert(!pageInfo.endCursor)
    expect(edges.length).to.equal(0)
  })

  it('should tranverse forward via page info cursor for all food product', async () => {
    const query = (first, after) => {
      return `
        {
          allFoodProducts(first: ${first}, after: "${after}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              node {
                name
                type
                price
              }
            }
          }
        }
      `
    }

    const query1 = query(25, '')
    let res = await graphql(schema, query1)
    let { pageInfo, edges } = res.data.allFoodProducts
    let { hasNextPage, endCursor } = pageInfo
    assert(hasNextPage)
    assert(endCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 25))

    const query2 = query(25, endCursor)
    res = await graphql(schema, query2)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(25, 50))

    const query3 = query(25, pageInfo.endCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(50, 75))

    const query4 = query(25, pageInfo.endCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(75, 100))

    const query5 = query(25, pageInfo.endCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(!pageInfo.hasNextPage)
    assert(pageInfo.endCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(100))

    const query6 = query(25, pageInfo.endCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(!pageInfo.hasNextPage)
    assert(!pageInfo.startCursor)
    assert(!pageInfo.endCursor)
    expect(edges.length).to.equal(0)
  })
})

describe('transverse backward', () => {
  it('should transverse backward via page info cursor for all starships', async () => {
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
    expect(edges).to.deep.equal(starshipsRef.slice(25, 35))

    const query3 = query(pageInfo.startCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(15, 25))

    const query4 = query(pageInfo.startCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(5, 15))

    const query5 = query(pageInfo.startCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allStarships.pageInfo
    edges = res.data.allStarships.edges
    assert(!pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges).to.deep.equal(starshipsRef.slice(0, 5))

    const query6 = query(pageInfo.startCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allStarships.pageInfo
    assert(!pageInfo.hasPreviousPage)
    assert(!pageInfo.startCursor)
  })

  it('should transverse backward via page info cursor for all food product', async () => {
    const query = before => {
      return `
        {
          allFoodProducts(last: 25, before: "${before}") {
            pageInfo {
              hasPreviousPage
              startCursor
            }
            edges {
              node {
                name
                type
                price
              }
            }
          }
        }
      `
    }

    const query1 = `
      {
        allFoodProducts {
          pageInfo {
            endCursor
          }
        }
      }
    `

    let res = await graphql(schema, query1)
    let { endCursor } = res.data.allFoodProducts.pageInfo
    assert(endCursor)

    const query2 = query(endCursor)
    res = await graphql(schema, query2)
    let { pageInfo, edges } = res.data.allFoodProducts
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(76, 101))

    const query3 = query(pageInfo.startCursor)
    res = await graphql(schema, query3)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(51, 76))

    const query4 = query(pageInfo.startCursor)
    res = await graphql(schema, query4)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(26, 51))

    const query5 = query(pageInfo.startCursor)
    res = await graphql(schema, query5)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    assert(pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(1, 26))

    const query6 = query(pageInfo.startCursor)
    res = await graphql(schema, query6)
    pageInfo = res.data.allFoodProducts.pageInfo
    edges = res.data.allFoodProducts.edges
    expect(edges[0].node).to.deep.equal(foodRef[0])
    assert(!pageInfo.hasPreviousPage)
    assert(pageInfo.startCursor)

    const query7 = query(pageInfo.startCursor)
    res = await graphql(schema, query7)
    pageInfo = res.data.allFoodProducts.pageInfo
    assert(!pageInfo.hasPreviousPage)
    assert(!pageInfo.startCursor)
  })
})

describe('after + first', () => {
  it('should fetch the first n starships after the cursor', async () => {
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
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(0, n))

    const res2 = await graphql(schema, query(edges[n - 1].cursor))
    const edges2 = res2.data.allStarships.edges
    expect(edges2.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(n, n * 2))
  })

  it('should fetch the first n food product after the cursor', async () => {
    const n = 3

    const query = after => {
      return `
        {
          allFoodProducts (first: ${n}, after: "${after}") {
            edges {
              node {
                name
                type
                price
              }
              cursor
            }
          }
        }
      `
    }

    const res = await graphql(schema, query(''))
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, n))

    const res2 = await graphql(schema, query(edges[n - 1].cursor))
    const edges2 = res2.data.allFoodProducts.edges
    expect(edges2.map(x => x.node)).to.deep.equal(foodRef.slice(n, n * 2))
  })
})

describe('after + first on non-unique field', () => {
  it('should fetch the first n starships after the cursor', async () => {
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
    expect(edges2.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(16, 19))
  })

  it('should fetch the first n food product after the cursor', async () => {
    const query = (first, after) => {
      return `
        {
          allFoodProducts (first: ${first}, after: "${after}") {
            edges {
              node {
                name
                type
                price
              }
              cursor
            }
          }
        }
      `
    }

    const res = await graphql(schema, query(48, ''))
    const { edges } = res.data.allFoodProducts

    const res2 = await graphql(schema, query(3, edges[47].cursor))
    const edges2 = res2.data.allFoodProducts.edges
    expect(edges2.map(x => x.node)).to.deep.equal(foodRef.slice(48, 51))
  })
})

describe('before + last on non-unique field', () => {
  it('should fetch the last n starships before the cursor', async () => {
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
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(23, 29))
  })

  it('should fetch the last n food product before the cursor', async () => {
    const pageQuery = `
      {
        allFoodProducts (first: 101) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allFoodProducts.pageInfo

    const query = `
      {
        allFoodProducts (last: 6, before: "${endCursor}") {
          edges {
            node {
              name
              type
              price
            }
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(94, 100))
  })
})

describe('before', () => {
  it('should fetch all the starships before the cursor', async () => {
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
        allStarships (before: "${endCursor}") {
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
    expect(edges).to.deep.equal(starshipsRef.slice(0, 29))
  })

  it('should fetch all the food product before the cursor', async () => {
    const pageQuery = `
      {
        allFoodProducts (first: 80) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allFoodProducts.pageInfo

    const query = `
      {
        allFoodProducts (before: "${endCursor}") {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 79))
  })
})

describe('after', () => {
  it('should fetch all the starships after the cursor', async () => {
    const pageQuery = `
      {
        allStarships (first: 5) {
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
        allStarships (after: "${endCursor}") {
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
    expect(edges).to.deep.equal(starshipsRef.slice(5))
  })

  it('should fetch all the food product after the cursor', async () => {
    const pageQuery = `
      {
        allFoodProducts (first: 12) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allFoodProducts.pageInfo

    const query = `
      {
        allFoodProducts (after: "${endCursor}") {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(12))
  })
})

describe('after + before', () => {
  it('should fetch all the starships after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allStarships(first: 8) {
          pageInfo {
            endCursor
          }
        }
        end: allStarships(first: 20) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allStarships(after: "${begin}", before: "${end}") {
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
    expect(edges).to.deep.equal(starshipsRef.slice(8, 19))
  })

  it('should fetch all the food product after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allFoodProducts(first: 23) {
          pageInfo {
            endCursor
          }
        }
        end: allFoodProducts(first: 68) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allFoodProducts(after: "${begin}", before: "${end}") {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(23, 67))
  })
})

describe('after + first + before', () => {
  it('should fetch the first n starships after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allStarships(first: 10) {
          pageInfo {
            endCursor
          }
        }
        end: allStarships(first: 28) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allStarships(after: "${begin}", first: 7, before: "${end}") {
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
    expect(edges).to.deep.equal(starshipsRef.slice(10, 17))
  })

  it('should fetch the fist n food product after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allFoodProducts(first: 48) {
          pageInfo {
            endCursor
          }
        }
        end: allFoodProducts(first: 93) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allFoodProducts(after: "${begin}", first: 10, before: "${end}") {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(48, 58))
  })
})

describe('last', () => {
  it('should fetch the last n starships', async () => {
    const query = `
      {
        allStarships(last: 12) {
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
    expect(edges).to.deep.equal(starshipsRef.slice(24))
  })

  it('should fetch the last n food product', async () => {
    const query = `
      {
        allFoodProducts(last: 20) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(82))
  })

  it('should throw on negative last', async () => {
    const last = -3
    const query = `
      {
        allFoodProducts(last: ${last}) {
          totalCount
        }
      }
    `
    const res = await graphql(schema, query)
    expect(res.errors).to.not.equal(null)
    expect(res.errors[0].message).to.equal(`last(${last}) could not be negative`)
  })
})

describe('first + before', () => {
  it('should fetch the first n starships before the cursor', async () => {
    const pageQuery = `
      {
        allStarships(first: 30) {
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
        allStarships(first: 16, before: "${endCursor}") {
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
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(0, 16))
  })

  it('should fetch the first n food product before the cursor', async () => {
    const pageQuery = `
      {
        allFoodProducts(first: 101) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allFoodProducts.pageInfo

    const query = `
      {
        allFoodProducts(first: 26, before: "${endCursor}") {
          edges {
            node {
              name
              type
              price
            }
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 26))
  })
})

describe('after + last', () => {
  it('should fetch the last n starships after the cursor', async () => {
    const query1 = `
      {
        allStarships(first: 16) {
          edges {
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query1)
    const { edges } = res.data.allStarships

    const query2 = `
      {
        allStarships(after: "${edges[15].cursor}", last: 12) {
          edges {
            node {
              model
              starshipClass
            }
          }
        }
      }
    `
    const res2 = await graphql(schema, query2)
    const edges2 = res2.data.allStarships.edges
    expect(edges2).to.deep.equal(starshipsRef.slice(24))
  })

  it('should fetch the last n food product after the cursor', async () => {
    const query1 = `
      {
        allFoodProducts(first: 57) {
          edges {
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query1)
    const { edges } = res.data.allFoodProducts

    const query2 = `
      {
        allFoodProducts(after: "${edges[56].cursor}", last: 27) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res2 = await graphql(schema, query2)
    const edges2 = res2.data.allFoodProducts.edges
    expect(edges2.map(x => x.node)).to.deep.equal(foodRef.slice(75))
  })
})

describe('after + before + last', () => {
  it('should fetch the last n starships after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allStarships(first: 10) {
          pageInfo {
            endCursor
          }
        }
        end: allStarships(first: 28) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allStarships(after: "${begin}", before: "${end}", last: 7) {
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
    expect(edges).to.deep.equal(starshipsRef.slice(20, 27))
  })

  it('should fetch the last n food product after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allFoodProducts(first: 48) {
          pageInfo {
            endCursor
          }
        }
        end: allFoodProducts(first: 93) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allFoodProducts(after: "${begin}", before: "${end}", last: 10) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(82, 92))
  })
})

describe('first', () => {
  it('fetch the first 7 starships', async () => {
    const query = `
      {
        allStarships(first: 7) {
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
    expect(edges).to.deep.equal(starshipsRef.slice(0, 7))
  })

  it('should fetch the first 13 food product', async () => {
    const query = `
      {
        allFoodProducts(first: 13) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `

    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 13))
  })
})

describe('first + last', () => {
  it('should ignore last and fetch the first 13 starships', async () => {
    const query = `
      {
        allStarships(first: 13, last: 12) {
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
    expect(edges).to.deep.equal(starshipsRef.slice(0, 13))
  })

  it('should ignore last and fetch the first 28 food product', async () => {
    const query = `
      {
        allFoodProducts(first: 28, last: 27) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `

    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 28))
  })
})

describe('first + before + last', () => {
  it('should ignore last and fetch the first 22 starships before the cursor', async () => {
    const pageQuery = `
      {
        allStarships(first: 28) {
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
        allStarships(first: 22, before: "${endCursor}", last: 3) {
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
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(0, 22))
  })

  it('should ignore last and fetch the first 76 food product before the cursor', async () => {
    const pageQuery = `
      {
        allFoodProducts(first: 101) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const { endCursor } = pageRes.data.allFoodProducts.pageInfo

    const query = `
      {
        allFoodProducts(first: 76, before: "${endCursor}", last: 20) {
          edges {
            node {
              name
              type
              price
            }
            cursor
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, 76))
  })
})

describe('after + first + last', () => {
  it('should ignore last and fetch the first 5 starships after the cursor', async () => {
    const n = 5

    const query = after => {
      return `
        {
          allStarships (first: ${n}, after: "${after}", last: 8) {
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
    expect(edges.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(0, n))

    const res2 = await graphql(schema, query(edges[n - 1].cursor))
    const edges2 = res2.data.allStarships.edges
    expect(edges2.map(e => pick(e, ['node']))).to.deep.equal(starshipsRef.slice(n, n * 2))
  })

  it('should ignore last and fetch the first 11 food product after the cursor', async () => {
    const n = 11

    const query = after => {
      return `
        {
          allFoodProducts (first: ${n}, after: "${after}", last: 1) {
            edges {
              node {
                name
                type
                price
              }
              cursor
            }
          }
        }
      `
    }

    const res = await graphql(schema, query(''))
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(0, n))

    const res2 = await graphql(schema, query(edges[n - 1].cursor))
    const edges2 = res2.data.allFoodProducts.edges
    expect(edges2.map(x => x.node)).to.deep.equal(foodRef.slice(n, n * 2))
  })
})

describe('after + first + before + last', () => {
  it('should ignore last and fetch the first 9 starships after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allStarships(first: 12) {
          pageInfo {
            endCursor
          }
        }
        end: allStarships(first: 25) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allStarships(after: "${begin}", first: 9, before: "${end}", last: 3) {
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
    expect(edges).to.deep.equal(starshipsRef.slice(12, 21))
  })

  it('should fetch the fist 28 food product after and before two given cursors', async () => {
    const pageQuery = `
      {
        begin: allFoodProducts(first: 36) {
          pageInfo {
            endCursor
          }
        }
        end: allFoodProducts(first: 96) {
          pageInfo {
            endCursor
          }
        }
      }
    `
    const pageRes = await graphql(schema, pageQuery)
    const begin = pageRes.data.begin.pageInfo.endCursor
    const end = pageRes.data.end.pageInfo.endCursor

    const query = `
      {
        allFoodProducts(after: "${begin}", first: 28, before: "${end}", last: 6) {
          edges {
            node {
              name
              type
              price
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(foodRef.slice(36, 64))
  })
})

describe('mapNode option', () => {
  it('should map the raw price to USD, EURO and YEN for non-food product', async () => {
    const query = `
      {
        allNonFoodProducts {
          edges {
            node {
              name
              type
              usd
              euro
              yen
            }
          }
        }
      }
    `
    const res = await graphql(schema, query)
    const { edges } = res.data.allNonFoodProducts
    expect(edges.map(x => x.node)).to.deep.equal(nonFoodRef)
  })
})

describe('default cursors', () => {
  const field = 'こんにちは世界2.71828182845904523536028'
  const id = mongoose.Types.ObjectId().toString()
  let cursor = ''
  it('should map (field, id) to cursor', () => {
    cursor = mrDefaultToCursor(field, id)
    expect(cursor).to.not.equal(null)
    expect(cursor.length).to.not.equal(0)
  })

  it('should map cursor back to (field, id)', () => {
    const back = mrDefaultFromCursor(cursor)
    expect(back.field).to.equal(field)
    expect(back.id).to.equal(id)
  })
})

describe('date cursors', () => {
  const date = new Date()
  const id = mongoose.Types.ObjectId().toString()
  let cursor = ''
  it('should map (date, id) to cursor', () => {
    cursor = mrDateToCursor(date, id)
    expect(cursor).to.not.equal(null)
    expect(cursor.length).to.not.equal(0)
  })

  it('should map cursor back to (date, id)', () => {
    const back = mrDateFromCursor(cursor)
    expect(back.field).to.be.an.instanceof(Date)
    expect(back.field.getTime()).to.equal(date.getTime())
    expect(back.id).to.equal(id)
  })
})
