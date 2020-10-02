import EncompassService from './service';
import { ListOfUsersOptions } from '../types';
import { objectToURLString } from '../utils';

class UserService extends EncompassService {
  /**
   * Gets a list of user profiles from the organization. Takes an optional
   * argument to apply a filter.
   */
  async getList(options?: ListOfUsersOptions): Promise<any[]> {
    const urlOptions = objectToURLString(options, true);
    const url = `/company/users${urlOptions}`;
    const data: any[] = await this.context.fetchWithRetry(url);
    return data;
  }

  /**
   * Returns a user profile. If no user profile is provided, will return
   * the profile matching the currently stored token.
   */
  async getProfile(losId?: string): Promise<any> {
    const url = `/company/users/${losId || 'me'}`;
    const data: any = await this.context.fetchWithRetry(url);
    return data;
  }
}

export default UserService;
