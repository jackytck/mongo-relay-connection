import mongoose from 'mongoose'

mongoose.Promise = global.Promise

// executed only once
before(done => {
  mongoose.connect('mongodb://localhost/mongo-relay-connection-test')
  mongoose.connection
    .once('open', () => {
      console.log('Connected to mongo')
      done()
    })
    .on('error', error => {
      console.warn('Warning', error)
    })
})
