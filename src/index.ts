/* eslint-disable camelcase */
import fetch, {
  Response,
  RequestInit,
  HeadersInit,
} from 'node-fetch';
import {
  EncompassConnectConstructor,
  InternalRequestOptions,
  PipeLineContract,
  BatchLoanUpdateContract,
  AssignMilestone,
  UpdateMilestone,
  LoanUpdateOptions,
} from './encompassInterfaces';

class EncompassConnect {
  #clientId: string;

  #APIsecret: string;

  #instanceId: string;

  #password: string;

  #token: string | null;

  username: string;

  base: string;

  constructor({
    clientId,
    APIsecret,
    instanceId,
    username,
    password,
  }: EncompassConnectConstructor) {
    this.#clientId = clientId;
    this.#APIsecret = APIsecret;
    this.#instanceId = instanceId;
    this.#password = password || '';
    this.#token = '';
    this.username = username || '';
    this.base = 'https://api.elliemae.com';
  }

  setToken(token:string | null): void {
    this.#token = token;
  }

  private withTokenHeader(headers = {}): HeadersInit {
    return {
      ...headers,
      Authorization: `Bearer ${this.#token}`,
    };
  }

  private async fetchWithRetry(
    path: string,
    options: RequestInit = {},
    customOptions: InternalRequestOptions = {},
  ): Promise<any> {
    const { isRetry, isNotJson } = customOptions;
    const failedAuthError = new Error(
      `Token invalid. ${!isRetry ? 'Will reattempt with new token' : 'Unable to get updated one.'}`,
    );
    try {
      if (!this.#token) {
        await this.getToken();
      }
      const url = `${this.base}${path}`;
      const optionsWithToken: RequestInit = {
        ...options,
        headers: this.withTokenHeader(options.headers),
      };
      const response: Response = await fetch(url, optionsWithToken);
      if (response.status === 401) {
        throw failedAuthError;
      }
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return isNotJson ? response : await response.json();
    } catch (error) {
      if (!isRetry && error === failedAuthError) {
        this.setToken(null);
        return this.fetchWithRetry(path, options, {
          ...customOptions,
          isRetry: true,
        });
      }
      throw error;
    }
  }

  async getToken(username?: string, password?: string): Promise<void> {
    const body: string = new URLSearchParams({
      grant_type: 'password',
      username: `${username || this.username}@encompass:${this.#instanceId}`,
      password: password || this.#password,
      client_id: this.#clientId,
      client_secret: this.#APIsecret,
    }).toString();

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      redirect: 'follow',
    };

    const response = await fetch(`${this.base}/oauth2/v1/token`, requestOptions);
    const { access_token } = await response.json();
    this.setToken(access_token);
  }

  async getCanonicalNames(): Promise<any> {
    const canonicalNames = await this.fetchWithRetry('/encompass/v1/loanPipeline/fieldDefinitions');
    return canonicalNames;
  }

  async viewPipeline(options: PipeLineContract, limit?: number) {
    const uri = `/encompass/v1/loanPipeline${limit ? `?limit=${limit}` : ''}`;
    const pipeLineData = await this.fetchWithRetry(uri, {
      method: 'POST',
      headers: this.withTokenHeader(),
      body: JSON.stringify(options),
    });
    return pipeLineData;
  }

  async batchLoanUpdate(options: BatchLoanUpdateContract): Promise<string> {
    const response: any = await this.fetchWithRetry('/encompass/v1/loanBatch/updateRequests', {
      method: 'POST',
      body: JSON.stringify(options),
    }, { isNotJson: true });
    return response && response.headers && response.headers.location
      ? response.headers.location.split('/').reverse()[0]
      : null;
  }

  loans = {
    getGuidByLoanNumber: async (loanNumber: string): Promise<string> => {
      const [loanResult] = await this.viewPipeline({
        filter: {
          operator: 'and',
          terms: [
            {
              canonicalName: 'Loan.LoanNumber',
              matchType: 'exact',
              value: loanNumber,
            },
          ],
        },
      });
      return loanResult ? loanResult.loanGuid : null;
    },
    get: async (guid: string, entities: string[]): Promise<any> => {
      const url = `/encompass/v1/loans/${guid}${entities ? `?entities=${entities.toString()}` : ''}`;
      const data: any = await this.fetchWithRetry(url);
      return data;
    },
    update: async (guid: string, loanData: any, options?: LoanUpdateOptions): Promise<any> => {
      const defaultOptions = [
        ['appendData', 'false'],
        ['persistent', 'transient'],
        ['view', 'entity'],
      ];
      // @ts-ignore
      const queryOptions = new URLSearchParams(options || defaultOptions).toString();
      const url = `/encompass/v1/loans/${guid}?${queryOptions}`;
      const fetchOptions: RequestInit = {
        method: 'PATCH',
        body: JSON.stringify(loanData),
      };
      const data = await this.fetchWithRetry(url, fetchOptions);
      return data;
    },
    delete: async (guid: string): Promise<void> => {
      await this.fetchWithRetry(
        `/encompass/v1/loans/${guid}`,
        { method: 'DELETE' },
        { isNotJson: true },
      );
    },
  }

  milestones = {
    get: async (guid: string) => {
      const milestones: any[] = await this.fetchWithRetry(`/encompass/v1/loans/${guid}/milestones`);
      return milestones;
    },
    assign: async ({
      milestone,
      userId,
      loanGuid,
    }: AssignMilestone): Promise<void> => {
      const milestoneData = await this.milestones.get(loanGuid);
      const matchingMilestone = milestoneData
        .find(({ milestoneName }) => milestone === milestoneName);
      if (!matchingMilestone) {
        throw new Error(`No milestone found for loan ${loanGuid} matching name "${milestone}"`);
      }
      const { id } = matchingMilestone;
      const fetchOptions = {
        method: 'PUT',
        body: JSON.stringify({
          loanAssociateType: 'User',
          id: userId,
        }),
      };
      await this.fetchWithRetry(`/encompass/v1/loans/${loanGuid}/associates/${id}`, fetchOptions, { isNotJson: true });
    },
    update: async ({
      loanGuid,
      milestone,
      options = {},
      action,
    }: UpdateMilestone): Promise<void> => {
      const milestoneData = await this.milestones.get(loanGuid);
      const matchingMilestone = milestoneData
        .find(({ milestoneName }) => milestone === milestoneName);
      if (!matchingMilestone) {
        throw new Error(`No milestone found for loan ${loanGuid} matching name "${milestone}"`);
      }
      const { id } = matchingMilestone;
      const fetchOptions = {
        method: 'PATCH',
        body: JSON.stringify(options),
      };
      const uri = `/encompass/v1/loans/${loanGuid}/milestones/${id}${action ? `?action=${action}` : ''}`;
      await this.fetchWithRetry(uri, fetchOptions, { isNotJson: true });
    },
  }
}

export default EncompassConnect;
