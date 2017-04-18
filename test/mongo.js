import 'babel-polyfill'
import assert from 'assert'
import Starship from './models/starship'

describe('mongo test', () => {
  it('should fetch correct number of starships from mongo', async () => {
    const cnt = await Starship.count()
    assert(cnt === 36)
  })
})
