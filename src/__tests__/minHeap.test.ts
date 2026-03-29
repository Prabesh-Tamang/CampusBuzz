import { MinHeap } from '@/lib/algorithms/minHeap';

describe('MinHeap', () => {
  const numComparator = (a: number, b: number) => a - b;

  test('insert and extractMin returns elements in ascending order', () => {
    const heap = new MinHeap<number>(numComparator);
    [5, 3, 8, 1, 9, 2].forEach(n => heap.insert(n));
    expect(heap.extractMin()).toBe(1);
    expect(heap.extractMin()).toBe(2);
    expect(heap.extractMin()).toBe(3);
  });

  test('peek does not remove element', () => {
    const heap = new MinHeap<number>(numComparator);
    heap.insert(4);
    heap.insert(2);
    expect(heap.peek()).toBe(2);
    expect(heap.size()).toBe(2);
  });

  test('extractMin on empty heap throws', () => {
    const heap = new MinHeap<number>(numComparator);
    expect(() => heap.extractMin()).toThrow('Heap is empty');
  });

  test('size and isEmpty work correctly', () => {
    const heap = new MinHeap<number>(numComparator);
    expect(heap.isEmpty()).toBe(true);
    heap.insert(1);
    expect(heap.isEmpty()).toBe(false);
    expect(heap.size()).toBe(1);
  });

  test('handles 1000 random inserts in correct order', () => {
    const heap = new MinHeap<number>(numComparator);
    const nums = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000));
    nums.forEach(n => heap.insert(n));

    const sorted = [...nums].sort((a, b) => a - b);
    const extracted = Array.from({ length: 1000 }, () => heap.extractMin());
    expect(extracted).toEqual(sorted);
  });

  test('waitlist comparator — lower priorityScore = extracted first', () => {
    interface Entry { userId: string; priorityScore: number }
    const heap = new MinHeap<Entry>((a, b) => a.priorityScore - b.priorityScore);

    heap.insert({ userId: 'alice', priorityScore: 1000 });
    heap.insert({ userId: 'bob',   priorityScore: 500 });
    heap.insert({ userId: 'carol', priorityScore: 750 });

    expect(heap.extractMin().userId).toBe('bob');
    expect(heap.extractMin().userId).toBe('carol');
    expect(heap.extractMin().userId).toBe('alice');
  });
});
