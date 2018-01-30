import mongoose, { Schema } from 'mongoose'

const PersonSchema = new Schema({
  name: String,
  age: Number
})

export default mongoose.model('Person', PersonSchema)
