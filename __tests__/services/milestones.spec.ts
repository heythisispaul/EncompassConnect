import querystring from 'querystring';
import { testInstanceWithToken, mockGuid } from '../__utils__/mockEncompassConnectInstances';
import { mockResponse, fetch } from '../__utils__/mockFunctions';
import { matchesFetchSnapshot, returnsResponseBody } from '../__utils__/commonTests';

jest.mock('node-fetch');

describe('milestones', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

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
      const usedQueryString = querystring.parse(url.split('?')[1]);
      expect(usedQueryString).toEqual({ action: 'finish' });
    });
  });
});
