/*
 * For getting the nested leaf object from path.
 * e.g. a={a:{b:{c:'nat'}}}, leaf(a, 'a.b.c') => 'nat'
 */
function leaf (object, path) {
  return path.split('.').reduce((value, key) => value[key], object)
}

export default leaf
