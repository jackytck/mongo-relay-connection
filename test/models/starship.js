import mongoose, { Schema } from 'mongoose'

const StarshipSchema = new Schema({
  model: String,
  starshipClass: String
})

export default mongoose.model('Starship', StarshipSchema)
