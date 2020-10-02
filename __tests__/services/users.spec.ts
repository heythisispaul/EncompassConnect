import { fetch } from '../__utils__/mockFunctions';
import { matchesFetchSnapshot } from '../__utils__/commonTests';
import { ListOfUsersOptions } from '../../src/types';

jest.mock('node-fetch');

describe('UserService', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  describe('getProfile', () => {
    it('makes the API call with provided LOS Id in the url', async () => {
      matchesFetchSnapshot('users.getProfile', '<TEST_LOS_ID>');
    });

    it('makes the API call with "me" in the url if no argument is provided', async () => {
      matchesFetchSnapshot('users.getProfile');
    });
  });

  describe('getList', () => {
    it('makes the request to the correct URL', () => {
      matchesFetchSnapshot('users.getList');
    });

    it('appends the filter object as a query string', () => {
      const options: ListOfUsersOptions = {
        groupId: 1,
        limit: 50,
        userName: 'Mr. Peanutbutter',
      };
      matchesFetchSnapshot('users.getList', options);
    });
  });
});
