import mongoose, { Schema } from 'mongoose'

const FileSchema = new Schema({
  name: String,
  type: String,
  stats: {
    size: Number
  }
})

export default mongoose.model('File', FileSchema)
