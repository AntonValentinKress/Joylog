export const GlobalStore = {
  data: {},

  set(key, value) {
    this.data[key] = value;
    globalThis.dispatchEvent(new CustomEvent('global-data-changed', {
      detail: { key, value }
    }));
  },

  get(key) {
    return this.data[key];
  }
};
