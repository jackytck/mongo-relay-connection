function leaf (object, path) {
  return path.split('.').reduce((value, key) => value[key], object)
}

export default leaf
