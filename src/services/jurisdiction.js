import request from '../utils/request';

export async function jurisdiction() {
  return request('/api/cms/info');
}
