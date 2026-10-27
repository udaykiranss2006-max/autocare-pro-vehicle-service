const { readJsonFile, mutateJsonFile } = require('./jsonStore');
const { newId } = require('../utils/id');

/** Generic CRUD helpers on top of a JSON array file. */
function createRepository(fileName, idPrefix) {
  const findAll = async (predicate) => {
    const list = await readJsonFile(fileName);
    return predicate ? list.filter(predicate) : list;
  };

  const findById = async (id) => (await readJsonFile(fileName)).find((r) => r.id === id) || null;

  const findOne = async (predicate) => (await readJsonFile(fileName)).find(predicate) || null;

  const insertRecord = (data) =>
    mutateJsonFile(fileName, (list) => {
      const now = new Date().toISOString();
      const record = { id: newId(idPrefix), ...data, createdAt: now, updatedAt: now };
      list.push(record);
      return record;
    });

  /** patch can be an object or a function(record) returning the patch. Returns null if not found. */
  const updateRecord = (id, patch) =>
    mutateJsonFile(fileName, async (list) => {
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return null;
      const current = list[index];
      const changes = typeof patch === 'function' ? await patch({ ...current }) : patch;
      const updated = { ...current, ...changes, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
      list[index] = updated;
      return updated;
    });

  const deleteRecord = (id) =>
    mutateJsonFile(fileName, (list) => {
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      return true;
    });

  /** Full-file transaction: mutator(list) runs while the file is locked. */
  const transaction = (mutator) => mutateJsonFile(fileName, mutator);

  return { fileName, findAll, findById, findOne, insertRecord, updateRecord, deleteRecord, transaction, newId: () => newId(idPrefix) };
}

module.exports = { createRepository };
