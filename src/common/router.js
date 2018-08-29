import React, { createElement } from 'react';
import { Spin } from 'antd';
import pathToRegexp from 'path-to-regexp';
import Loadable from 'react-loadable';
import MyComponent from './component';

let routerDataCache;

const getRouterDataCache = app => {
  if (!routerDataCache) {
    routerDataCache = getRouterData(app);
  }
  return routerDataCache;
};

const modelNotExisted = (app, model) =>
  // eslint-disable-next-line
  !app._models.some(({ namespace }) => {
    return namespace === model.substring(model.lastIndexOf('/') + 1);
  });

// wrapper of dynamic
const dynamicWrapper = (app, models, component) => {
  // register models
  models.forEach(model => {
    if (modelNotExisted(app, model)) {
      // eslint-disable-next-line
      app.model(require(`../models/${model}`).default);
    }
  });

  // () => require('module')
  // transformed by babel-plugin-dynamic-import-node-sync
  if (component.toString().indexOf('.then(') < 0) {
    return props => {
      return createElement(component().default, {
        ...props,
        routerData: getRouterDataCache(app),
      });
    };
  }
  // () => import('module')
  return Loadable({
    loader: () => {
      return component().then(raw => {
        const Component = raw.default || raw;
        return props =>
          createElement(Component, {
            ...props,
            routerData: getRouterDataCache(app),
          });
      });
    },
    loading: () => {
      return <Spin size="large" className="global-spin" />;
    },
  });
};

function findMenuKey(menuData, path) {
  const menuKey = Object.keys(menuData).find(key => pathToRegexp(path).test(key));
  if (menuKey == null) {
    if (path === '/') {
      return null;
    }
    const lastIdx = path.lastIndexOf('/');
    if (lastIdx < 0) {
      return null;
    }
    if (lastIdx === 0) {
      return findMenuKey(menuData, '/');
    }
    // 如果没有，使用上一层的配置
    return findMenuKey(menuData, path.substr(0, lastIdx));
  }
  return menuKey;
}

/** 添加路由 */
const addRoute = (app, dataMap, data) => {
  let res = dataMap;
  if (data.code.indexOf('CMS_') > -1 && (data.type === 1 || (data.type === 2 && data.url))) {
    const models = MyComponent[data.code] ? MyComponent[data.code].models : [];
    const componentPath = MyComponent[data.code]
      ? MyComponent[data.code].componentUrl
      : '/Exception/404';
    res = {
      ...res,
      [data.url]: {
        component: dynamicWrapper(app, models, () => import(`../routes${componentPath}`)),
      },
    };
  }
  return res;
};
/** 获取路径 */
const getPath = data => {
  let path = '';
  if (data.code.indexOf('CMS_') > -1 && (data.type === 1 || (data.type === 2 && data.url))) {
    path = data.url;
  } else {
    path = data.system_url + data.url;
  }
  return path;
};
/** 记录菜单 */
const recordMenu = (menu, data) => {
  const res = menu;
  if (data.type === 1) {
    res.push(data);
  }
  return res;
};
/** 记录权限 */
const recordPermissions = (permissions, data) => {
  let res = permissions;
  if (data.code.indexOf('CMS_') > -1 && data.type === 2) {
    res = {
      ...res,
      [data.code]: true,
    };
  }
  return res;
};

export const getRouterData = (app, data) => {
  let user = {};
  let menu = [];
  let dataMap = {};
  let permissions = {};
  if (data && data.userInfo) {
    user = data.userInfo;
  }
  if (data && data.userRole) {
    data.userRole.forEach(item => {
      if (item.children && item.children.length > 0) {
        let children = [];
        menu = recordMenu(menu, {
          name: item.name,
          code: item.code,
          type: item.type,
          icon: 'user',
          path: getPath(item),
          children,
        });
        dataMap = addRoute(app, dataMap, item);
        permissions = recordPermissions(permissions, item);
        item.children.forEach(iitem => {
          if (iitem.children && iitem.children.length > 0) {
            let cchildren = [];
            children = recordMenu(children, {
              name: iitem.name,
              code: iitem.code,
              type: iitem.type,
              icon: '',
              path: getPath(iitem),
              children: cchildren,
            });
            dataMap = addRoute(app, dataMap, iitem);
            permissions = recordPermissions(permissions, iitem);
            iitem.children.forEach(iiitem => {
              cchildren = recordMenu(cchildren, {
                name: iiitem.name,
                code: iiitem.code,
                type: iiitem.type,
                icon: '',
                path: getPath(iiitem),
              });
              dataMap = addRoute(app, dataMap, iiitem);
              permissions = recordPermissions(permissions, iiitem);
            });
          } else {
            children = recordMenu(children, {
              name: iitem.name,
              code: iitem.code,
              type: iitem.type,
              icon: '',
              path: getPath(iitem),
            });
            dataMap = addRoute(app, dataMap, iitem);
            permissions = recordPermissions(permissions, iitem);
          }
        });
      } else {
        menu = recordMenu(menu, {
          name: item.name,
          code: item.code,
          type: item.type,
          icon: 'user',
          path: getPath(item),
        });
        dataMap = addRoute(app, dataMap, item);
        permissions = recordPermissions(permissions, item);
      }
    });
  }
  const routerConfig = {
    '/': {
      component: dynamicWrapper(app, [], () => import('../layouts/BasicLayout')),
    },
    '/cms/index': {
      component: dynamicWrapper(app, [], () => import(`../routes/index`)),
    },
    ...dataMap,
  };
  // Get name from ./menu.js or just set it in the router data.

  // Route configuration data
  // eg. {name,authority ...routerConfig }
  const routerData = {};
  // The route matches the menu
  Object.keys(routerConfig).forEach(path => {
    // Regular match item name
    // eg.  router /user/:id === /user/chen
    let menuKey = Object.keys(menu).find(key => pathToRegexp(path).test(`${key}`));
    const inherited = menuKey == null;
    if (menuKey == null) {
      menuKey = findMenuKey(menu, path);
    }
    let menuItem = {};
    // If menuKey is not empty
    if (menuKey) {
      menuItem = menu[menuKey];
    }
    let router = routerConfig[path];
    // If you need to configure complex parameter routing,
    // https://github.com/ant-design/ant-design-pro-site/blob/master/docs/router-and-nav.md#%E5%B8%A6%E5%8F%82%E6%95%B0%E7%9A%84%E8%B7%AF%E7%94%B1%E8%8F%9C%E5%8D%95
    // eg . /list/:type/user/info/:id
    router = {
      ...router,
      name: router.name || menuItem.name,
      authority: router.authority || menuItem.authority,
      hideInBreadcrumb: router.hideInBreadcrumb || menuItem.hideInBreadcrumb,
      inherited,
    };
    routerData[path] = router;
  });
  return {
    routerData,
    menu,
    user,
  };
};
