import { testInstanceWithToken } from '../__utils__/mockEncompassConnectInstances';
import { mockResponse, fetch } from '../__utils__/mockFunctions';
import { matchesFetchSnapshot, returnsResponseBody } from '../__utils__/commonTests';

jest.mock('node-fetch');

describe('schemas', () => {
  beforeEach(() => {
    fetch.mockReset();
  });
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
