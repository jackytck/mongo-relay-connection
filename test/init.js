import mongoose from 'mongoose'
import Starship from './models/starship'
import Product from './models/product'
import starshipData from './data/starships.json'
import productData from './data/products.json'

mongoose.Promise = global.Promise

function clearDB () {
  return Promise.all([
    Starship.remove(),
    Product.remove()
  ])
}

function populateStarship () {
  const { data: { allStarships: { edges } } } = starshipData
  return Promise.all(edges.map(({ node }) => {
    const ship = new Starship(node)
    return ship.save()
  }))
}

function populateProduct () {
  return Promise.all(productData.map(p => {
    const product = new Product(p)
    return product.save()
  }))
}

function populateData () {
  return Promise.all([
    populateStarship(),
    populateProduct()
  ])
}

// executed only once
before(done => {
  mongoose.connect('mongodb://localhost/mongo-relay-connection-test')
  mongoose.connection
    .once('open', async () => {
      // console.log('Connected to mongo')
      await clearDB()
      await populateData()
      // console.log('Populated data')
      done()
    })
    .on('error', error => {
      console.warn('Warning', error)
    })
})
