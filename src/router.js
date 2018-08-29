import React from 'react';
import { routerRedux, Switch, Route } from 'dva/router';
import { LocaleProvider } from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import { getRouterData } from './common/router';
import { jurisdiction } from './services/jurisdiction';

const { ConnectedRouter } = routerRedux;

async function getRouter() {
  const data = await jurisdiction();
  return function RouterConfig({ history, app }) {
    const {
      routerData,
      menu,
      user,
    } = getRouterData(app,data);
    const BasicLayout = routerData['/'].component;
    const ownProps = {
      app,
      router: routerData,
      menu,
      user,
      userInfo: data.userInfo,
    }
    return (
      <LocaleProvider locale={zhCN}>
        <ConnectedRouter history={history}>
          <Switch>
            <Route
              path="/"
              render={props => <BasicLayout {...props} {...ownProps} />}
            />
          </Switch>
        </ConnectedRouter>
      </LocaleProvider>
    );
  }
}

export default getRouter;
