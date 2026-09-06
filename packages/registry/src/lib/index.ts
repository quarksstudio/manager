import * as Packages from './Packages';
import * as Auth from './Auth';
import * as Gateway from './Gateway';
import { apiRequest, type ApiFetchOptions } from './api-fetch';

export class Client {
  static API = '';
  static version = '1.0.0';

  private token = '';

  public Auth = {};
  public Packages = {};
  public Gateway = {};

  constructor(token = '') {
    this.token = token;
    this.Packages = Object.entries(Packages).reduce(
      (acc, [name, fn]) => ({
        ...acc,
        [name]: fn.bind(this),
      }),
      {},
    );

    this.Auth = Object.entries(Auth).reduce(
      (acc, [name, fn]) => ({
        ...acc,
        [name]: fn.bind(this),
      }),
      {},
    );

    this.Gateway = Object.entries(Gateway).reduce(
      (acc, [name, fn]) => ({
        ...acc,
        [name]: fn.bind(this),
      }),
      {},
    );
  }

  async _fetch(url: string, options: Record<string, any> = {}) {
    const response = await this._request(url, options);

    if (options['proxy']) {
      return response.body;
    }

    return response.json();
  }

  async _request(
    url: string,
    options: Record<string, any> = {},
  ): Promise<Response> {
    const headers = new Headers(this._headers());
    new Headers(options['headers']).forEach((value, key) =>
      headers.set(key, value),
    );
    let body = options['body'];
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    const requestOptions = { ...options };
    delete requestOptions['proxy'];
    return apiRequest(`${Client.API}/${url}`, {
      method: 'GET',
      ...(requestOptions as ApiFetchOptions),
      body,
      headers,
    });
  }

  _headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Version': Client.version,
      'X-Client': Client.name,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }
}
