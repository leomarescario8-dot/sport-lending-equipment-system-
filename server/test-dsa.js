import assert from 'node:assert';
import { HashTable, Queue, Stack, Trie, mergeSort, quickSort, binarySearch, linearSearch, makeComparator } from './dsa.js';

const h = new HashTable(); h.set('a', 1); h.set('b', 2); h.set('a', 3);
assert.equal(h.get('a'), 3); assert.equal(h.count, 2); assert.ok(h.delete('b')); assert.equal(h.get('b'), undefined);

const q = new Queue(); q.enqueue(1); q.enqueue(2); q.enqueue(3);
assert.equal(q.dequeue(), 1); assert.deepEqual(q.toArray(), [2, 3]); assert.equal(q.length, 2);

const s = new Stack(); s.push(1); s.push(2); assert.equal(s.pop(), 2); assert.equal(s.peek(), 1);

const t = new Trie(); ['Basketball', 'Badminton Racket', 'Volleyball'].forEach((w) => t.insert(w));
assert.deepEqual(t.startsWith('ba').sort(), ['Badminton Racket', 'Basketball']); assert.deepEqual(t.startsWith('zz'), []);

const data = [{ n: 'b', q: 3 }, { n: 'a', q: 9 }, { n: 'c', q: 1 }, { n: 'a', q: 5 }];
const byN = makeComparator('n'), byQDesc = makeComparator('q', 'desc');
assert.deepEqual(mergeSort(data, byN).map((x) => x.n), ['a', 'a', 'b', 'c']);
assert.deepEqual(quickSort(data, byQDesc).map((x) => x.q), [9, 5, 3, 1]);
const sorted = mergeSort(data, byN);
assert.equal(binarySearch(sorted, 'a', (x) => x.n), 0);
assert.equal(binarySearch(sorted, 'c', (x) => x.n), 3);
assert.equal(binarySearch(sorted, 'z', (x) => x.n), -1);
assert.equal(linearSearch(data, 'A', ['n']).length, 2);
console.log('All DSA tests passed');
