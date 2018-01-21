import File from './models/file'
import Product from './models/product'
import Starship from './models/starship'
import fileData from './data/files.json'
import mongoose from 'mongoose'
import productData from './data/products.json'
import starshipData from './data/starships.json'

mongoose.Promise = global.Promise

function clearDB () {
  return Promise.all([
    Starship.remove(),
    Product.remove(),
    File.remove()
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

function populateFile () {
  return Promise.all(fileData.map(f => {
    const file = new File(f)
    return file.save()
  }))
}

function populateData () {
  return Promise.all([
    populateStarship(),
    populateProduct(),
    populateFile()
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

after(() => {
  mongoose.connection.close()
})
