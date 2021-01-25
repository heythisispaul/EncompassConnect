import EncompassConnect from '../src/encompassConnect';
import { BatchLoanUpdateContract } from '../src/types';
import {
  mockFetchError,
  mockResponse,
  mockResponseTimes,
  mockResponseJson,
  fetch,
} from './__utils__/mockFunctions';
import {
  testInstanceWithToken,
  testInstanceWithCreds,
  testInstanceWithOnAuth,
  testInstance,
  mockToken,
  defaultCreds,
  createConstructor,
  mockOnAuthenticate,
} from './__utils__/mockEncompassConnectInstances';
import {
  returnsResponseBody,
  matchesFetchSnapshot,
} from './__utils__/commonTests';

jest.mock('node-fetch');

describe('EncompassConnect', () => {
  beforeEach(() => {
    fetch.mockReset();
    mockResponseJson.mockReset();
    mockOnAuthenticate.mockReset();
  });

  describe('getTokenWithCredentials', () => {
    it('uses the username and password from the constructor to create a token if none are provided', async () => {
      mockResponse({ access_token: mockToken });
      await testInstanceWithCreds.getTokenWithCredentials();
      expect(fetch.mock.calls[0]).toMatchSnapshot();
    });

    it('uses the provided username and password over the ones in the constructor to create a token', async () => {
      mockResponse({ access_token: mockToken });
      await testInstance.getTokenWithCredentials('PROVIDED_USERNAME', 'PROVIDED_PASSWORD');
      expect(fetch.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('introspectToken', () => {
    it('returns the body of the response if the call was successful', async () => {
      const mockIntrospectResponse = 'mock introspect response';
      mockResponse(mockIntrospectResponse);
      const result = await testInstanceWithCreds.introspectToken();
      expect(result).toEqual(mockIntrospectResponse);
    });

    it('returns null if the token is invalid', async () => {
      mockResponse({ error: 'token invalid' }, 400);
      const result = await testInstanceWithCreds.introspectToken();
      expect(result).toEqual(null);
    });

    it('returns null if an exception occurs', async () => {
      mockFetchError();
      const result = await testInstanceWithCreds.introspectToken();
      expect(result).toEqual(null);
    });

    it('adds an Authorization header to the fetch request', async () => {
      await testInstanceWithCreds.introspectToken();
      // @ts-ignore
      const { headers } = fetch.mock.calls[0][1];
      // @ts-ignore
      expect(<string>headers.Authorization).toBeTruthy();
    });

    it('introspects the token provided over the stored token', async () => {
      const testToken = 'TEST_TOKEN_VALUE';
      await testInstanceWithCreds.introspectToken(testToken);
      // @ts-ignore
      const { body } = fetch.mock.calls[0][1];
      expect(body).toEqual(`token=${testToken}`);
    });
  });

  describe('getToken', () => {
    it('returns the #token value of the instance', () => {
      const token = testInstanceWithToken.getToken();
      expect(token).toEqual(mockToken);
    });
  });

  describe('getCanonicalNames', () => {
    it('requests the correct endpoint', async () => {
      mockResponse();
      await testInstanceWithToken.getCanonicalNames();
      // @ts-ignore
      const path: string = fetch.mock.calls[0][0];
      expect(path.includes('/loanPipeline/fieldDefinitions')).toBeTruthy();
    });

    it('fetches with the correct request options', async () => (
      matchesFetchSnapshot('getCanonicalNames')
    ));

    it('returns the body of the response', async () => (
      returnsResponseBody('getCanonicalNames')
    ));
  });

  describe('viewPipeline', () => {
    const defaultOptions = {
      filter: {
        operator: 'and' as any,
        terms: [],
      },
      fields: ['test.field'],
    };
    it('makes the API call with the correct information', async () => (
      matchesFetchSnapshot('viewPipeline', defaultOptions)
    ));

    it('adds the limit query string if provided', async () => {
      mockResponse();
      await testInstanceWithToken.viewPipeline(defaultOptions, 100);
      // @ts-ignore
      const path: string = fetch.mock.calls[0][0];
      expect(path.includes('?limit=100')).toBeTruthy();
    });

    it('returns the body of the response', async () => (
      returnsResponseBody('viewPipeline', defaultOptions)
    ));
  });

  describe('batchLoanUpdate', () => {
    const defaultOptions: BatchLoanUpdateContract = {
      loanGuids: ['test-1', 'test-2'],
      loanData: {
        key1: 'value1',
        key2: 'value2',
      },
    };

    it('makes the API call with the correct information', async () => (
      matchesFetchSnapshot('batchLoanUpdate', defaultOptions)
    ));

    it('returns a BatchUpdate object with the request id', async () => {
      const id = '12345';
      mockResponse({}, 200, { location: `some/path/${id}` });
      const batchUpdate = await testInstanceWithToken.batchLoanUpdate(defaultOptions);
      expect(batchUpdate.getRequestId()).toEqual(id);
    });

    it('returns a BatchUpdate object that can fetch its status', async () => {
      const id = '9876';
      mockResponse({}, 200, { location: `some/path/${id}` });
      mockResponse();
      const batchUpdate = await testInstanceWithToken.batchLoanUpdate(defaultOptions);
      await batchUpdate.getUpdateStatus();
      expect(fetch.mock.calls[1]).toMatchSnapshot();
    });
  });

  describe('request', () => {
    it('fetches with the correct information', async () => {
      mockResponse();
      await testInstanceWithToken.request('test/url', { method: 'POST', body: JSON.stringify({ some: 'value' }) });
      expect(fetch.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('fetchWithRetry', () => {
    const createNewInstanceWithToken = (excludeCreds?: boolean, tokenValue: string = 'some token value'): EncompassConnect => {
      const newInstanceWithToken = new EncompassConnect(
        createConstructor(excludeCreds ? {} : defaultCreds),
      );
      newInstanceWithToken.setToken(tokenValue);
      return newInstanceWithToken;
    };

    it('fetches a token if one is not already set in the instance', async () => {
      expect.assertions(2);
      mockResponseTimes(2);
      const newInstance = new EncompassConnect(createConstructor(defaultCreds));
      await newInstance.getCanonicalNames();
      expect(fetch).toHaveBeenCalledTimes(2);
      const firstRequestedUrl = fetch.mock.calls[0][0];
      expect(firstRequestedUrl).toEqual(`${testInstanceWithCreds.authBase}/oauth2/v1/token`);
    });

    it('gets a fetches a token if the response was a 401 status and it has credentials', async () => {
      mockResponse({}, 401);
      mockResponseTimes(2);
      const newInstanceWithBadToken = createNewInstanceWithToken();
      await newInstanceWithBadToken.getCanonicalNames();
      expect(fetch).toHaveBeenCalledTimes(3);
      const firstRequestedUrl = fetch.mock.calls[1][0];
      expect(firstRequestedUrl).toEqual(`${testInstanceWithCreds.authBase}/oauth2/v1/token`);
    });

    it('retries the same request if it successfully gets a new token', async () => {
      mockResponse({}, 401);
      mockResponseTimes(2);
      const newInstanceWithBadToken = createNewInstanceWithToken();
      await newInstanceWithBadToken.getCanonicalNames();
      const [firstCall, retriedCall] = [0, 2].map((number) => fetch.mock.calls[number][0]);
      expect(firstCall).toEqual(retriedCall);
    });

    it('throws an error if it receives a non-401 but invalid status code', async () => {
      mockResponse({}, 500);
      const instanceWithToken = createNewInstanceWithToken();
      await expect(instanceWithToken.getCanonicalNames())
        .rejects.toThrowError();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry if it receives a 401 but does not have a credentials', async () => {
      mockResponseTimes(3, {}, 401);
      const instanceWithToken = createNewInstanceWithToken(true);
      await expect(instanceWithToken.getCanonicalNames())
        .rejects.toThrowError();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('deletes the invalid token if it receives a 401', async () => {
      mockResponseTimes(3, {}, 401);
      const instanceWithToken = createNewInstanceWithToken();
      await expect(instanceWithToken.getCanonicalNames())
        .rejects.toThrowError();
      const firstCallAfterFailure = fetch.mock.calls[1][0];
      expect(firstCallAfterFailure).toEqual(`${testInstanceWithCreds.authBase}/oauth2/v1/token`);
    });

    it('does not attempt to parse the body if provided in the config', async () => {
      mockResponseTimes(3);
      const instanceWithToken = createNewInstanceWithToken();
      await instanceWithToken.request('someurl');
      expect(mockResponseJson).not.toHaveBeenCalled();
    });

    it('calls the onAuthenticated function if provided', async () => {
      mockResponseTimes(3);
      await testInstanceWithOnAuth.request('someurl');
      expect(mockOnAuthenticate).toHaveBeenCalled();
    });
  });
});
