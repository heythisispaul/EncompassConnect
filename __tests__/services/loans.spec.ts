import querystring from 'querystring';
import { testInstanceWithToken, mockGuid } from '../__utils__/mockEncompassConnectInstances';
import { mockResponse, fetch } from '../__utils__/mockFunctions';
import { matchesFetchSnapshot, returnsResponseBody } from '../__utils__/commonTests';
import { LoanUpdateOptions, UpdateLoanWithGenerateContract } from '../../src/types';

jest.mock('node-fetch');

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

  beforeEach(() => {
    fetch.mockReset();
  });

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
      const usedQueryString = querystring.parse(url.split('?')[1]);
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

  describe('fieldReader', () => {
    const fields = ['4000', '4002'];
    const fieldReaderResponse = [
      { fieldId: 'field1', value: 'value 1' },
      { fieldId: 'field2', value: 'value 2' },
    ];

    it('makes the API call with the correct information', async () => (
      matchesFetchSnapshot('loans.fieldReader', mockGuid, fields)
    ));

    it('appends the query string if the includeMetadata flag is set to true', async () => (
      matchesFetchSnapshot('loans.fieldReader', mockGuid, fields, { includeMetadata: true })
    ));

    it(' calls the reduceFieldReaderValues side effect if the mapResponse key is true', async () => {
      mockResponse(fieldReaderResponse);
      const result = await testInstanceWithToken.loans
        .fieldReader(mockGuid, fields, { mapResponse: true });
      expect(result).toEqual({ field1: 'value 1', field2: 'value 2' });
    });
  });
});
