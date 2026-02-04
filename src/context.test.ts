import { describe, expect, it } from 'vitest';
import { createContext } from './context';
import { createStore, setStore, testReactivity } from './test-utils';

describe('ComponentContext', () => {
  const makeCtx = () => {
    const host = document.createElement('div');
    const disposers = new Set<() => void>();
    return { ctx: createContext(host, disposers, testReactivity), disposers, host };
  };

  describe('effect — single store', () => {
    it('invokes callback with current value on subscribe', () => {
      const { ctx } = makeCtx();
      const store = createStore(10);
      const values: unknown[] = [];
      ctx.effect(store, (v) => values.push(v));
      expect(values).toEqual([10]);
    });

    it('invokes callback on subsequent updates', () => {
      const { ctx } = makeCtx();
      const store = createStore(1);
      const values: unknown[] = [];
      ctx.effect(store, (v) => values.push(v));
      setStore(store, 2);
      setStore(store, 3);
      expect(values).toEqual([1, 2, 3]);
    });

    it('cleans up subscription on dispose', () => {
      const { ctx, disposers } = makeCtx();
      const store = createStore(0);
      ctx.effect(store, () => {});
      expect(store.subs.size).toBe(1);
      for (const d of disposers) d();
      expect(store.subs.size).toBe(0);
    });
  });

  describe('effect — array of stores', () => {
    it('invokes callback with all current values initially', () => {
      const { ctx } = makeCtx();
      const a = createStore(1);
      const b = createStore(2);
      const snapshots: unknown[] = [];
      ctx.effect([a, b], (vals) => snapshots.push(vals));
      // First element is from the explicit initial call
      expect(snapshots[0]).toEqual([1, 2]);
    });

    it('re-invokes with updated snapshot when any store changes', () => {
      const { ctx } = makeCtx();
      const a = createStore(10);
      const b = createStore(20);
      const snapshots: unknown[] = [];
      ctx.effect([a, b], (vals) => snapshots.push(vals));
      setStore(a, 99);
      expect(snapshots[snapshots.length - 1]).toEqual([99, 20]);
      setStore(b, 88);
      expect(snapshots[snapshots.length - 1]).toEqual([99, 88]);
    });

    it('cleans up all subscriptions on dispose', () => {
      const { ctx, disposers } = makeCtx();
      const a = createStore(0);
      const b = createStore(0);
      ctx.effect([a, b], () => {});
      expect(a.subs.size).toBe(1);
      expect(b.subs.size).toBe(1);
      for (const d of disposers) d();
      expect(a.subs.size).toBe(0);
      expect(b.subs.size).toBe(0);
    });
  });

  describe('dispatch', () => {
    it('emits a custom event with detail on the host', () => {
      const { ctx, host } = makeCtx();
      const events: CustomEvent[] = [];
      host.addEventListener('my-event', (e) => events.push(e as CustomEvent));
      ctx.dispatch('my-event', { foo: 'bar' });
      expect(events.length).toBe(1);
      expect(events[0].detail).toEqual({ foo: 'bar' });
      expect(events[0].bubbles).toBe(true);
      expect(events[0].cancelable).toBe(true);
    });

    it('defaults detail to undefined when omitted', () => {
      const { ctx, host } = makeCtx();
      const events: CustomEvent[] = [];
      host.addEventListener('ping', (e) => events.push(e as CustomEvent));
      ctx.dispatch('ping');
      // CustomEvent detail defaults to null per spec when omitted
      expect(events[0].detail).toBeNull();
    });
  });

  describe('on', () => {
    it('attaches a listener and removes it on dispose', () => {
      const { ctx, disposers, host } = makeCtx();
      let clicks = 0;
      ctx.on(host, 'click', () => { clicks++; });
      host.dispatchEvent(new MouseEvent('click'));
      expect(clicks).toBe(1);
      for (const d of disposers) d();
      host.dispatchEvent(new MouseEvent('click'));
      expect(clicks).toBe(1);
    });

    it('attaches listeners to an array of targets', () => {
      const { ctx } = makeCtx();
      const a = document.createElement('button');
      const b = document.createElement('button');
      let clicks = 0;
      ctx.on([a, b], 'click', () => { clicks++; });
      a.dispatchEvent(new MouseEvent('click'));
      b.dispatchEvent(new MouseEvent('click'));
      expect(clicks).toBe(2);
    });
  });

  describe('getElement', () => {
    it('returns the first matching descendant', () => {
      const { ctx, host } = makeCtx();
      const span = document.createElement('span');
      span.className = 'target';
      host.appendChild(span);
      expect(ctx.getElement('.target')).toBe(span);
    });

    it('throws when no element matches', () => {
      const { ctx } = makeCtx();
      expect(() => ctx.getElement('.missing')).toThrow(/not found/);
    });
  });

  describe('getElements', () => {
    it('returns all matching descendants', () => {
      const { ctx, host } = makeCtx();
      const a = document.createElement('span');
      const b = document.createElement('span');
      host.appendChild(a);
      host.appendChild(b);
      expect(ctx.getElements('span')).toEqual([a, b]);
    });

    it('returns empty array when nothing matches', () => {
      const { ctx } = makeCtx();
      expect(ctx.getElements('.nope')).toEqual([]);
    });
  });

  describe('registerCleanup', () => {
    it('runs registered callbacks on dispose', () => {
      const { ctx, disposers } = makeCtx();
      let ran = false;
      ctx.registerCleanup(() => { ran = true; });
      expect(ran).toBe(false);
      for (const d of disposers) d();
      expect(ran).toBe(true);
    });
  });
});
