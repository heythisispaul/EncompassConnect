import fetchActual from 'node-fetch';
import { mocked } from 'ts-jest/utils';
import EncompassConnect from '../src';
import { BatchLoanUpdateContract } from '../src/encompassInterfaces';

jest.mock('node-fetch');

const fetch = mocked(fetchActual);

describe('EncompassConnect', () => {
  const createConstructor = (additions = {}) => ({
    clientId: '<CLIENT ID>',
    APIsecret: '<API SECRET>',
    instanceId: '<INSTANCE ID>',
    ...additions,
  });
  const mockResponse = (value: any = {}, status: number = 200, headers?: any) => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(value),
      status,
      ok: (status < 400),
      // @ts-ignore
      headers: headers
        ? { get: (header) => headers[header] }
        : null,
    });
  };
  const mockFetchError = (message: string = 'uh oh') => {
    fetch.mockImplementationOnce(() => {
      throw new Error(message);
    });
  };

  const defaultCreds = {
    username: '<CONSTRUCTOR USERNAME>',
    password: '<CONSTRUCTOR PASSWORD>',
  };
  const mockToken = '<MOCK TOKEN VALUE>';
  const testInstanceWithCreds = new EncompassConnect(createConstructor(defaultCreds));
  const testInstance = new EncompassConnect(createConstructor());
  const testInstanceWithToken = new EncompassConnect(createConstructor(defaultCreds));
  testInstanceWithToken.setToken(mockToken);

  const returnsResponseBody = async (classMethod: any, ...args: any) => {
    const testValue = '<EXPECTED RETURN VALUE>';
    mockResponse(testValue);
    const result = await classMethod.call(testInstanceWithToken, ...args);
    expect(result).toEqual(testValue);
  };

  const matchesFetchSnapshot = async (classMethod: any, ...args: any) => {
    mockResponse();
    await classMethod.call(testInstanceWithToken, ...args);
    expect(fetch.mock.calls[0]).toMatchSnapshot();
  };

  beforeEach(() => {
    fetch.mockReset();
  });

  describe('getToken', () => {
    it('uses the username and password from the constructor to create a token if none are provided', async () => {
      mockResponse({ access_token: mockToken });
      await testInstanceWithCreds.getToken();
      expect(fetch.mock.calls[0]).toMatchSnapshot();
    });

    it('uses the provided username and password over the ones in the constructor to create a token', async () => {
      mockResponse({ access_token: mockToken });
      await testInstance.getToken('PROVIDED_USERNAME', 'PROVIDED_PASSWORD');
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
      expect(headers.Authorization).toBeTruthy();
    });

    it('introspects the token provided over the stored token', async () => {
      const testToken = 'TEST_TOKEN_VALUE';
      await testInstanceWithCreds.introspectToken(testToken);
      // @ts-ignore
      const { body } = fetch.mock.calls[0][1];
      expect(body).toEqual(`token=${testToken}`);
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
      matchesFetchSnapshot(testInstanceWithToken.getCanonicalNames)
    ));

    it('returns the body of the response', async () => (
      returnsResponseBody(testInstanceWithToken.getCanonicalNames)
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
      matchesFetchSnapshot(testInstanceWithToken.viewPipeline, defaultOptions)
    ));

    it('adds the limit query string if provided', async () => {
      mockResponse();
      await testInstanceWithToken.viewPipeline(defaultOptions, 100);
      // @ts-ignore
      const path: string = fetch.mock.calls[0][0];
      expect(path.includes('?limit=100')).toBeTruthy();
    });

    it('returns the body of the response', async () => (
      returnsResponseBody(testInstanceWithToken.viewPipeline, defaultOptions)
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
      matchesFetchSnapshot(testInstanceWithToken.batchLoanUpdate, defaultOptions)
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

  describe('schemas', () => {
    describe('generateContract', () => {
      const mockValues = {
        317: 'Todd Chavez',
        2: '10000',
      };

      it('makes the API call with the correct information', async () => {
        mockResponse();
        await testInstanceWithToken.schemas.generateContract(mockValues);
        expect(fetch.mock.calls[0]).toMatchSnapshot();
      });

      it('returns the body of the response', async () => (
        returnsResponseBody(testInstanceWithToken.schemas.generateContract, mockValues)
      ));
    });

    describe('getLoanSchema', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot(testInstanceWithToken.schemas.getLoanSchema)
      ));

      it('returns the body of the response', async () => (
        returnsResponseBody(testInstanceWithToken.schemas.getLoanSchema)
      ));

      it('adds the entities from the provided array to the query string', async () => {
        const entities = ['princess', 'caroline'];
        mockResponse();
        await testInstanceWithToken.schemas.getLoanSchema(entities);
        // @ts-ignore
        const path: string = fetch.mock.calls[0][0];
        expect(path.includes('?entities=princess,caroline')).toBeTruthy();
      });
    });
  });

  describe('loans', () => {
    describe('getGuidByLoanNumber', () => {
      const testLoanNumber = '1234567';

      it('returns null if there is no matching loan found', async () => {
        mockResponse([]);
        const guid = await testInstanceWithToken.loans.getGuidByLoanNumber(testLoanNumber);
        expect(guid).toEqual(null);
      });

      it('returns the loanGuid value of the first index of the pipeline response', async () => {
        const mockLoanGuid = 'loan guid value';
        mockResponse([{ loanGuid: mockLoanGuid }]);
        const guid = await testInstanceWithToken.loans.getGuidByLoanNumber(testLoanNumber);
        expect(guid).toEqual(mockLoanGuid);
      });
    });
  });
});
