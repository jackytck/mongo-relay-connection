import mongoose, { Schema } from 'mongoose'

const StorySchema = new Schema({
  title: String,
  author: { type: Schema.Types.ObjectId, ref: 'Person' }
})

export default mongoose.model('Story', StorySchema)
