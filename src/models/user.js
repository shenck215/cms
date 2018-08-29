export default {
  namespace: 'user',

  state: {
    list: [],
    initLoading: false,
  },

  effects: {
  },

  reducers: {
    initLoading(state, action) {
      debugger
      return {
        ...state,
        initLoading: action.payload,
      };
    },
  },
};
