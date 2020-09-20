import querysting from 'querystring';
import fetchActual from 'node-fetch';
import { mocked } from 'ts-jest/utils';
import EncompassConnect from '../src';
import {
  BatchLoanUpdateContract,
  LoanUpdateOptions,
  UpdateLoanWithGenerateContract,
} from '../src/encompassInterfaces';

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
  const mockGuid = '<MOCK GUID VALUE>';
  const testInstance = new EncompassConnect(createConstructor());
  const testInstanceWithCreds = new EncompassConnect(createConstructor(defaultCreds));
  const testInstanceWithToken = new EncompassConnect(createConstructor(defaultCreds));
  testInstanceWithToken.setToken(mockToken);

  const getNestedMethod = (
    methodLocation: string,
    originalObject: EncompassConnect,
  ) => methodLocation
    .split('.')
    .reduce((acc: any, current: any) => acc[current], originalObject);

  const returnsResponseBody = async (methodLocation: string, ...args: any) => {
    const testValue = '<EXPECTED RETURN VALUE>';
    mockResponse(testValue);
    const method: any = getNestedMethod(methodLocation, testInstanceWithToken);
    const result = await method.call(testInstanceWithToken, ...args);
    expect(result).toEqual(testValue);
  };

  const matchesFetchSnapshot = async (methodLocation: string, ...args: any) => {
    mockResponse();
    const method: any = getNestedMethod(methodLocation, testInstanceWithToken);
    await method.call(testInstanceWithToken, ...args);
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
        returnsResponseBody('schemas.generateContract', mockValues)
      ));
    });

    describe('getLoanSchema', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot('schemas.getLoanSchema')
      ));

      it('returns the body of the response', async () => (
        returnsResponseBody('schemas.getLoanSchema')
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
    const testLoanUpdateData = {
      applications: [
        {
          id: 'borrower_1',
          borrower: {
            firstName: 'Todd',
            lastName: 'Chavez',
          },
        },
      ],
    };

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

    describe('get', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot('loans.get', mockGuid)
      ));

      it('returns the body of the response', async () => (
        returnsResponseBody('loans.get', mockGuid)
      ));

      it('adds the entities from the provided array to the query string', async () => {
        const entities = ['diane', 'nguyen'];
        mockResponse();
        await testInstanceWithToken.loans.get(mockGuid, entities);
        // @ts-ignore
        const path: string = fetch.mock.calls[0][0];
        expect(path.includes('?entities=diane,nguyen')).toBeTruthy();
      });
    });

    describe('update', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot('loans.update', mockGuid, testLoanUpdateData)
      ));

      it('uses the optional options if provided', async () => {
        mockResponse();
        const options: LoanUpdateOptions = {
          appendData: 'true',
          persistent: 'permanent',
          view: 'id',
        };
        await testInstanceWithToken.loans.update(mockGuid, testLoanUpdateData, options);
        // @ts-ignore
        const url: string = fetch.mock.calls[0][0];
        const usedQueryString = querysting.parse(url.split('?')[1]);
        expect(usedQueryString).toEqual(options);
      });
    });

    describe('updateWithGeneratedContract', () => {
      it('makes the API call with the correct information', async () => {
        mockResponse({
          testContract: '<GENERATE CONTRACT RESPONSE>',
        });
        mockResponse();
        const testData: UpdateLoanWithGenerateContract = {
          standardFields: {
            317: 'Bojack Horseman',
          },
          customFields: {
            'CX.TEST.FIELD': 'test value',
          },
        };
        await testInstanceWithToken.loans.updateWithGeneratedContract(mockGuid, testData);
        expect(fetch.mock.calls[1]).toMatchSnapshot();
      });
    });

    describe('delete', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot('loans.delete', mockGuid)
      ));
    });
  });

  describe('milestones', () => {
    const testMilestoneId = '<MATCHING MILESTONE ID>';
    const testMilestoneName = 'some milestone';

    describe('get', () => {
      it('makes the API call with the correct information', async () => (
        matchesFetchSnapshot('milestones.get', mockGuid)
      ));

      it('returns the body of the response', async () => (
        returnsResponseBody('milestones.get', mockGuid)
      ));
    });

    describe('assign', () => {
      it('throws an error if a matching milestone can not be found', async () => {
        mockResponse([]);
        const milestoneName = 'some milestone that will not match';
        await expect(testInstanceWithToken.milestones.assign({
          loanGuid: mockGuid,
          milestone: milestoneName,
          userId: 'MFuzzyface',
        })).rejects.toThrowError(`No milestone found for loan ${mockGuid} matching name "${milestoneName}"`);
      });

      it('calls the update milestone associate API with the correct information', async () => {
        mockResponse([{
          milestoneName: testMilestoneName,
          id: testMilestoneId,
        }]);
        mockResponse();
        await testInstanceWithToken.milestones.assign({
          loanGuid: mockGuid,
          milestone: testMilestoneName,
          userId: '<PROVIDED USER ID>',
        });
        expect(fetch.mock.calls[1]).toMatchSnapshot();
      });
    });

    describe('update', () => {
      it('throws an error if a matching milestone can not be found', async () => {
        mockResponse([]);
        const milestoneName = 'some milestone that will not match';
        await expect(testInstanceWithToken.milestones.update({
          loanGuid: mockGuid,
          milestone: milestoneName,
          options: {},
        })).rejects.toThrowError(`No milestone found for loan ${mockGuid} matching name "${milestoneName}"`);
      });

      it('calls the update milestone associate API with the correct information', async () => {
        mockResponse([{
          milestoneName: testMilestoneName,
          id: testMilestoneId,
        }]);
        mockResponse();
        await testInstanceWithToken.milestones.update({
          loanGuid: mockGuid,
          milestone: testMilestoneName,
          options: { provided: 'options' },
        });
        expect(fetch.mock.calls[1]).toMatchSnapshot();
      });

      it('appends the provided action as a query string', async () => {
        mockResponse([{
          milestoneName: testMilestoneName,
          id: testMilestoneId,
        }]);
        mockResponse();
        await testInstanceWithToken.milestones.update({
          loanGuid: mockGuid,
          milestone: testMilestoneName,
          options: {},
          action: 'finish',
        });
        // @ts-ignore
        const url: string = fetch.mock.calls[1][0];
        const usedQueryString = querysting.parse(url.split('?')[1]);
        expect(usedQueryString).toEqual({ action: 'finish' });
      });
    });
  });
});
