import './polyfill';
import dva from 'dva';

import browserHistory from 'history/createBrowserHistory';
// user BrowserHistory
// import createHistory from 'history/createBrowserHistory';
import createLoading from 'dva-loading';
import 'moment/locale/zh-cn';
import './rollbar';
import router from './router';

import './index.less';
// 1. Initialize
const app = dva({
  history: browserHistory(),
});

// 2. Plugins
app.use(createLoading());

router().then(f => {
  // 3. Register global model
  app.model(require('./models/global').default);
  // 4. Router
  app.router(f);
  // 5. Start
  app.start('#root');
})

export default app._store; // eslint-disable-line
