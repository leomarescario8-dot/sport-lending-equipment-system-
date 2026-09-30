// ================= DATA STRUCTURES =================

// 1) HASH TABLE (separate chaining) - O(1) average lookup by id
export class HashTable {
  constructor(size = 64) {
    this.size = size;
    this.buckets = Array.from({ length: size }, () => []);
    this.count = 0;
  }
  _hash(key) {
    const s = String(key);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % this.size;
    return h;
  }
  set(key, value) {
    const bucket = this.buckets[this._hash(key)];
    const entry = bucket.find((e) => e[0] === key);
    if (entry) entry[1] = value;
    else { bucket.push([key, value]); this.count++; }
  }
  get(key) {
    const entry = this.buckets[this._hash(key)].find((e) => e[0] === key);
    return entry ? entry[1] : undefined;
  }
  has(key) { return this.get(key) !== undefined; }
  delete(key) {
    const bucket = this.buckets[this._hash(key)];
    const i = bucket.findIndex((e) => e[0] === key);
    if (i === -1) return false;
    bucket.splice(i, 1); this.count--; return true;
  }
  values() { return this.buckets.flat().map((e) => e[1]); }
}

// 2) QUEUE (linked nodes, FIFO) - waitlist for borrowed-out equipment
export class Queue {
  constructor() { this.head = null; this.tail = null; this.length = 0; }
  enqueue(value) {
    const node = { value, next: null };
    if (this.tail) this.tail.next = node; else this.head = node;
    this.tail = node; this.length++;
  }
  dequeue() {
    if (!this.head) return undefined;
    const { value } = this.head;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.length--; return value;
  }
  peek() { return this.head ? this.head.value : undefined; }
  isEmpty() { return this.length === 0; }
  toArray() {
    const out = []; let n = this.head;
    while (n) { out.push(n.value); n = n.next; }
    return out;
  }
}

// 3) STACK (LIFO) - undo history
export class Stack {
  constructor() { this.items = []; }
  push(v) { this.items.push(v); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  get length() { return this.items.length; }
}

// 4) TRIE (prefix tree) - autocomplete suggestions
export class Trie {
  constructor() { this.root = { children: new Map(), words: new Set() }; }
  insert(word) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), words: new Set() });
      node = node.children.get(ch);
      node.words.add(word);
    }
  }
  startsWith(prefix, limit = 8) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      node = node.children.get(ch);
      if (!node) return [];
    }
    return [...node.words].slice(0, limit);
  }
}

// ================= ALGORITHMS =================

// Comparator builder (strings case-insensitive, numbers numeric)
export function makeComparator(field, order = 'asc') {
  const dir = order === 'desc' ? -1 : 1;
  return (a, b) => {
    const x = a[field], y = b[field];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' }) * dir;
  };
}

// 1) MERGE SORT - O(n log n), stable
export function mergeSort(arr, cmp) {
  if (arr.length <= 1) return arr.slice();
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), cmp);
  const right = mergeSort(arr.slice(mid), cmp);
  const out = []; let i = 0, j = 0;
  while (i < left.length && j < right.length) out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}

// 2) QUICK SORT - O(n log n) average
export function quickSort(arr, cmp) {
  const a = arr.slice();
  const sort = (lo, hi) => {
    if (lo >= hi) return;
    const pivot = a[Math.floor((lo + hi) / 2)];
    let i = lo, j = hi;
    while (i <= j) {
      while (cmp(a[i], pivot) < 0) i++;
      while (cmp(a[j], pivot) > 0) j--;
      if (i <= j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; }
    }
    sort(lo, j); sort(i, hi);
  };
  sort(0, a.length - 1);
  return a;
}

// 3) BINARY SEARCH - O(log n) on an array sorted by keyFn (returns first match index or -1)
export function binarySearch(sorted, target, keyFn) {
  let lo = 0, hi = sorted.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = keyFn(sorted[mid]);
    if (k === target) { found = mid; hi = mid - 1; } // keep going left for first match
    else if (k < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return found;
}

// 4) LINEAR SEARCH - O(n) keyword match across several fields
export function linearSearch(arr, keyword, fields) {
  const q = keyword.trim().toLowerCase();
  if (!q) return arr.slice();
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    for (const f of fields) {
      if (String(arr[i][f] ?? '').toLowerCase().includes(q)) { out.push(arr[i]); break; }
    }
  }
  return out;
}
