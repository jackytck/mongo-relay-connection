import mongoose, { Schema } from 'mongoose'

const ProductSchema = new Schema({
  name: String,
  type: String,
  price: Number
})

export default mongoose.model('Product', ProductSchema)
