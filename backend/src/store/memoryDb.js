const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const collections = {
  users: [],
  ambulances: [],
  emergencies: [],
};

function id() {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "location" && value && value.$near) return true;
    if (value && typeof value === "object" && value.toString && doc[key]) {
      return String(doc[key]) === String(value);
    }
    return String(doc[key]) === String(value);
  });
}

function pick(doc, fields) {
  const copy = { ...doc };
  if (!fields || !String(fields).includes("+password")) {
    delete copy.password;
  }
  return copy;
}

async function populateDoc(doc, path, select) {
  if (!doc) return doc;
  if (path === "driver" || path === "patient") {
    const user = collections.users.find((u) => String(u._id) === String(doc[path]));
    if (!user) return doc;
    const cloned = { ...user };
    delete cloned.password;
    doc[path] = cloned;
  }
  if (path === "ambulance") {
    const amb = collections.ambulances.find((a) => String(a._id) === String(doc.ambulance));
    if (amb) doc.ambulance = { ...amb };
  }
  return doc;
}

function attach(doc, collectionName) {
  if (!doc) return doc;
  const live = doc;
  live.save = async function save() {
    const list = collections[collectionName];
    const idx = list.findIndex((d) => String(d._id) === String(live._id));
    const stored = { ...live };
    delete stored.save;
    delete stored.populate;
    delete stored.toSafeJSON;
    delete stored.comparePassword;
    if (idx >= 0) list[idx] = { ...list[idx], ...stored };
    else list.push(stored);
    return live;
  };
  live.populate = async function populate(paths) {
    const list = Array.isArray(paths) ? paths : [paths];
    for (const p of list) {
      const path = typeof p === "string" ? p : p.path;
      const select = typeof p === "string" ? undefined : p.select;
      await populateDoc(live, path, select);
    }
    return live;
  };
  live.toSafeJSON = function toSafeJSON() {
    return {
      id: live._id,
      name: live.name,
      email: live.email,
      role: live.role,
      phone: live.phone,
    };
  };
  live.comparePassword = function comparePassword(plain) {
    return bcrypt.compare(plain, live.password);
  };
  return live;
}

function query(result, collectionName) {
  let rows = Promise.resolve(result);
  const q = {
    sort() {
      return q;
    },
    limit(n) {
      rows = rows.then((docs) => (Array.isArray(docs) ? docs.slice(0, n) : docs));
      return q;
    },
    select(fields) {
      rows = rows.then((docs) => {
        if (Array.isArray(docs)) return docs.map((d) => attach({ ...pick(d, fields) }, collectionName));
        return docs ? attach({ ...pick(docs, fields) }, collectionName) : docs;
      });
      return q;
    },
    populate(path, select) {
      rows = rows.then(async (docs) => {
        const arr = Array.isArray(docs) ? docs : docs ? [docs] : [];
        const populated = await Promise.all(
          arr.map(async (d) => {
            const copy = attach({ ...d }, collectionName);
            if (typeof path === "string") await populateDoc(copy, path, select);
            else if (Array.isArray(path)) {
              for (const p of path) await populateDoc(copy, p.path || p, p.select);
            }
            return copy;
          })
        );
        return Array.isArray(docs) ? populated : populated[0] || null;
      });
      return q;
    },
    then(onF, onR) {
      return rows
        .then((docs) => {
          if (Array.isArray(docs)) return docs.map((d) => attach({ ...d }, collectionName));
          return docs ? attach({ ...docs }, collectionName) : docs;
        })
        .then(onF, onR);
    },
  };
  return q;
}

const User = {
  async create(data) {
    const password = await bcrypt.hash(data.password, 10);
    const doc = {
      _id: id(),
      name: data.name,
      email: data.email,
      password,
      role: data.role || "patient",
      phone: data.phone,
    };
    collections.users.push(doc);
    return attach({ ...doc }, "users");
  },
  find(filter = {}) {
    return query(
      collections.users.filter((d) => matches(d, filter)),
      "users"
    );
  },
  findOne(filter = {}) {
    const doc = collections.users.find((d) => matches(d, filter)) || null;
    return query(doc, "users");
  },
  findById(docId) {
    const doc = collections.users.find((d) => String(d._id) === String(docId)) || null;
    return query(doc, "users");
  },
  async deleteMany() {
    collections.users.length = 0;
  },
};

const Ambulance = {
  async create(data) {
    const doc = {
      _id: id(),
      vehicleNumber: data.vehicleNumber,
      driver: data.driver,
      status: data.status || "available",
      location: data.location || { type: "Point", coordinates: [77.209, 28.6139] },
      hospitalName: data.hospitalName,
    };
    collections.ambulances.push(doc);
    return attach({ ...doc }, "ambulances");
  },
  find(filter = {}) {
    const status = filter.status;
    const docs = collections.ambulances.filter((d) => (status ? d.status === status : true));
    return query(docs, "ambulances");
  },
  findOne(filter = {}) {
    const doc = collections.ambulances.find((d) => matches(d, filter)) || null;
    return query(doc, "ambulances");
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    const doc = collections.ambulances.find((d) => matches(d, filter));
    if (!doc) return null;
    Object.assign(doc, update);
    return opts.new === false ? doc : attach({ ...doc }, "ambulances");
  },
  async findByIdAndUpdate(docId, update, opts = {}) {
    const doc = collections.ambulances.find((d) => String(d._id) === String(docId));
    if (!doc) return null;
    Object.assign(doc, update);
    return opts.new === false ? doc : attach({ ...doc }, "ambulances");
  },
  findById(docId) {
    const doc = collections.ambulances.find((d) => String(d._id) === String(docId)) || null;
    return query(doc, "ambulances");
  },
  async deleteMany() {
    collections.ambulances.length = 0;
  },
};

const EmergencyRequest = {
  async create(data) {
    const doc = {
      _id: id(),
      patient: data.patient,
      ambulance: data.ambulance || null,
      driver: data.driver || null,
      pickupLocation: data.pickupLocation,
      destination: data.destination,
      notes: data.notes,
      status: data.status || "pending",
      createdAt: new Date(),
    };
    collections.emergencies.push(doc);
    return attach({ ...doc }, "emergencies");
  },
  find(filter = {}) {
    const docs = collections.emergencies
      .filter((d) => matches(d, filter))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return query(docs, "emergencies");
  },
  findById(docId) {
    const doc = collections.emergencies.find((d) => String(d._id) === String(docId)) || null;
    return query(doc, "emergencies");
  },
  async deleteMany() {
    collections.emergencies.length = 0;
  },
};

async function seedMemory() {
  if (collections.users.length) return;
  const patient = await User.create({
    name: "Demo Patient",
    email: "patient@demo.com",
    password: "password123",
    role: "patient",
    phone: "9000000001",
  });
  const driver = await User.create({
    name: "Demo Driver",
    email: "driver@demo.com",
    password: "password123",
    role: "driver",
    phone: "9000000002",
  });
  await User.create({
    name: "Demo Dispatcher",
    email: "dispatcher@demo.com",
    password: "password123",
    role: "dispatcher",
    phone: "9000000003",
  });
  await Ambulance.create({
    vehicleNumber: "DL-01-AMB-1001",
    driver: driver._id,
    hospitalName: "City General Hospital",
    status: "available",
    location: { type: "Point", coordinates: [77.2295, 28.6129] },
  });
  return patient;
}

module.exports = { User, Ambulance, EmergencyRequest, seedMemory, collections };
