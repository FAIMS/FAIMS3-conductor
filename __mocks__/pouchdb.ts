const dataStore: {[key: string]: {[key: string]: any}} = {};

class PouchDB {
  name: string;
  options: any;

  constructor(name: string, options: any) {
    this.name = name;
    this.options = options;
    if (!dataStore[name]) {
      dataStore[name] = {};
    }
  }

  get(document: any) {
    // should throw an error if the document isn't here:
    const doc = dataStore[this.name][document];
    if (!doc) {
      throw Error(`document ${document} not in mock database} `);
    }
    return new Promise((resolve, reject) => {
      resolve(doc);
    });
  }

  allDocs() {
    const objects = Object.values(dataStore[this.name]);
    return new Promise((resolve, reject) => {
      resolve({
        offset: 0,
        total_rows: objects.length,
        rows: objects.map(doc => {
          return {
            doc: doc,
            id: doc._id,
            key: doc._id,
            value: {
              rev: doc._id,
            },
          };
        }),
      });
    });
  }

  put(document: any) {
    dataStore[this.name][document._id] = document;
    return new Promise((resolve, reject) => {
      resolve({});
    });
  }

  show() {
    //console.log(JSON.stringify(dataStore, null, 2));
    console.log(Object.keys(dataStore));
  }
}

module.exports = PouchDB;
export {};