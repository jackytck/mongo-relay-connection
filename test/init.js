import mongoose from 'mongoose'
import Starship from './models/starship'
import data from './data/starships.json'

mongoose.Promise = global.Promise

function clearDB () {
  return Starship.remove()
}

function populateData () {
  const { data: { allStarships: { edges } } } = data
  return Promise.all(edges.map(({ node }) => {
    const ship = new Starship(node)
    return ship.save()
  }))
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
