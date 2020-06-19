/**
 * All dependencies object - Which computed callbacks to call for which data property
 * {
 *   [observable property]: [{
 *      key: [observer property or computed property], callback: [function to generate the computed]
 *   }]
 * }
 */
const allDependencies = {};

/**
 * Current dependencies of the computed props
 */
let currDependencies = [];

/**
 * Checks if object is a function
 * @param {Object} obj
 */
function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}

/**
 * Check if object has the prop
 * @param {Object} obj
 * @param {String} prop
 */
function checkIfOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Setup getters and setters and keys
 * @param {String} curKey
 */
function defineData(curKey, parent, observer) {
  // Step 1: Define properties in this with the same key
  Object.defineProperty(this, curKey, {
    /**
     * Getter for the key
     */
    get: () => {
      // Step 1: Check if key is in data
      if (checkIfOwnProperty(this.data, curKey)) {
        // Step i: Add to dependencies
        currDependencies.push(curKey);

        // Step ii: Return result
        return this.data[curKey];
      }
      // Throw error when key is undefined
      throw new Error('KEY_IS_UNDEFINED');
    },
    /**
     * Setter for the key
     * @param {*} value
     */
    set: (value) => {
      // Step i: Set the value
      this.data[curKey] = value;

      // Step ii: Call the observer if there is an observer
      if (checkIfOwnProperty(observer, curKey) && isFunction(observer[curKey])) {
        observer[curKey].call(this, value);
      }

      // Step iii: Update all the dependent
      if (checkIfOwnProperty(allDependencies, curKey)) {
        // Step iii.1: Loop through all the callback and call them
        for (let i = 0; i < allDependencies[curKey].length; i += 1) {
          this.computed[
            allDependencies[curKey][i].key
          ] = allDependencies[curKey][i].callback.call(this);
        }
      }
    },
  });

  // Step 2: Set the default value
  this.data[curKey] = parent[curKey];
}

/**
 * Set the getter and setter for a computed property
 * @param {String} key
 */
function getSetComputed(key) {
  Object.defineProperty(this, key, {
    /**
      * Getter for the key
      */
    get: () => {
      if (checkIfOwnProperty(this.computed, key)) {
        return this.computed[key];
      }
      return 'KEY_DELETED';
    },

    /**
      * Setters cannot be accessed
      */
    set() {
      throw new Error('COMPUTED_PROPERTIES_CANNOT_BE_SET');
    },
  });
}

/**
 *
 * @param {String} key
 * @param {Function} cb
 */
function defineComputed(key, cb) {
  // Step 1: Empty the current dependencies
  currDependencies = [];

  // Step 2: Run the call back and set the initial value and set getter and setter
  this.computed[key] = cb.call(this);
  getSetComputed.call(this, key);

  // Step 3: Check which dependencies were required
  for (let i = 0; i < currDependencies.length; i += 1) {
    // Step 3.1 Get the current key
    const curKey = currDependencies[i];

    // Step 3.2: Check if current dependency already has a callback array.
    // If already there push the new callback or else create a new callback array
    if (checkIfOwnProperty(allDependencies, curKey)) {
      allDependencies[curKey].push({
        key,
        callback: cb,
      });
    } else {
      allDependencies[curKey] = [{
        key,
        callback: cb,
      }];
    }
  }

  // Step 4: Clear current dependencies
  currDependencies = [];
}

/**
 * "watch" object observes the "data" object
 * @param {Object} data
 * @param {Object} watch
 */
export default function Observable(obj) {
  // Step 1: Set an empty data object and computed
  this.data = {};
  this.computed = {};

  // Step 2: Setting data properties
  if (checkIfOwnProperty(obj, 'data')) {
    // Step 2.1: Data
    const { data } = obj;

    // Step 2.2: Watch
    const watch = checkIfOwnProperty(obj, 'watch') ? obj.watch : {};

    // Step 2.3: Loop through all the keys and set the getters and setters
    for (const key of Object.keys(data)) {
      // Step 2.3.1.1: Define getters and setters
      defineData.call(this, key, data, watch);
    }
  }

  // Step 3: Setting up computed properties and dependencies
  if (checkIfOwnProperty(obj, 'computed')) {
    // Step 3.1: Computed
    const { computed } = obj;

    // Step 3.2: loop through all the keys and define the computed
    for (const key of Object.keys(computed)) {
      // Step 3.2.1: Check if key is actually a key and not in __proto__,
      // it is a function and data property of the same name doesn't exists
      if (isFunction(computed[key]) && !checkIfOwnProperty(this, key)) {
        // Step 3.2.1.1: Define computed
        defineComputed.call(this, key, computed[key]);
      }
    }
  }
}