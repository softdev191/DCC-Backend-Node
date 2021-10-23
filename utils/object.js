export const renameProperty = function (obj, oldName, newName) {
  // Do nothing if the names are the same
  if (oldName === newName) {
    return obj;
  }
  // Check for the old property name to avoid a ReferenceError in strict mode.
  if (obj.hasOwnProperty(oldName)) {
    obj[newName] = obj[oldName];
    delete obj[oldName];
  }

  return obj;
};

export const renameProperties = function (obj, keyBindings) {
  Object.entries(keyBindings).forEach(([oldName, newName]) => {
    renameProperty(obj, oldName, newName);
  });

  return obj;
}
