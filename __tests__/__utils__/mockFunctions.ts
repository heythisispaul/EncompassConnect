import fetchActual from 'node-fetch';
import { mocked } from 'ts-jest/utils';

jest.mock('node-fetch');

export const fetch = mocked(fetchActual);

export const mockResponseJson = jest.fn();

export const createConstructor = (additions = {}) => ({
  clientId: '<CLIENT ID>',
  APIsecret: '<API SECRET>',
  instanceId: '<INSTANCE ID>',
  ...additions,
});

export const mockResponse = (value: any = {}, status: number = 200, headers?: any) => {
  // @ts-ignore
  fetch.mockResolvedValueOnce({
    json: () => {
      mockResponseJson();
      return Promise.resolve(value);
    },
    status,
    ok: (status < 400),
    // @ts-ignore
    headers: headers
      ? { get: (header) => headers[header] }
      : null,
  });
};

export const mockFetchError = (message: string = 'uh oh') => {
  fetch.mockImplementationOnce(() => {
    throw new Error(message);
  });
};

export const mockResponseTimes = (times: number, ...args: any) => {
  for (let i = 0; i < times; i += 1) {
    mockResponse(...args);
  }
};
