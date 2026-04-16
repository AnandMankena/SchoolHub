function clean(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  return obj;
}

function cleanMany(docs) {
  return docs.map((d) => {
    const obj = d.toObject ? d.toObject() : { ...d };
    delete obj._id;
    delete obj.__v;
    return obj;
  });
}

function now() {
  return new Date().toISOString();
}

module.exports = { clean, cleanMany, now };
