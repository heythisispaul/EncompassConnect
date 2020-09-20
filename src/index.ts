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
  batchUpdateStatus,
  UpdateLoanWithGenerateContract,
  BatchUpdate,
  TokenIntrospection,
} from './encompassInterfaces';
import { massageCustomFields } from './utils';

class EncompassConnect {
  #clientId: string;

  #APIsecret: string;

  #instanceId: string;

  #password: string;

  #token: string | null;

  username: string;

  base: string;

  authBase: string;

  version: number;

  constructor({
    clientId,
    APIsecret,
    instanceId,
    username,
    password,
    version = 1,
  }: EncompassConnectConstructor) {
    this.#clientId = clientId;
    this.#APIsecret = APIsecret;
    this.#instanceId = instanceId;
    this.#password = password || '';
    this.#token = '';
    this.username = username || '';
    this.version = version;
    this.base = 'https://api.elliemae.com/encompass';
    this.authBase = 'https://api.elliemae.com';
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
    const { isRetry, isNotJson, version } = customOptions;
    const shouldRetry = !isRetry && this.username && this.#password;
    const failedAuthError = new Error(
      `Token invalid. ${!isRetry ? 'Will reattempt with new token' : 'Unable to get updated one.'}`,
    );
    try {
      if (!this.#token) {
        await this.getToken();
      }
      const url = `${this.base}/v${version || this.version}${path}`;
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
      if (shouldRetry && error === failedAuthError) {
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
    // @ts-ignore
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

    const response = await fetch(`${this.authBase}/oauth2/v1/token`, requestOptions);
    const { access_token } = await response.json();
    this.setToken(access_token);
  }

  async introspectToken(token?: string): Promise<TokenIntrospection | null> {
    // @ts-ignore
    const body: string = new URLSearchParams({
      token: token || this.#token,
    }).toString();
    const Authorization: string = `Basic ${Buffer.from(`${this.#clientId}:${this.#APIsecret}`).toString('base64')}`;
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization,
      },
      body,
    };
    try {
      const response = await fetch(`${this.authBase}/oauth2/v1/token/introspection`, requestOptions);
      if (response.ok) {
        const tokenData: TokenIntrospection = await response.json();
        return tokenData;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getCanonicalNames(): Promise<any> {
    const canonicalNames = await this.fetchWithRetry('/loanPipeline/fieldDefinitions');
    return canonicalNames;
  }

  async viewPipeline(options: PipeLineContract, limit?: number) {
    const uri = `/loanPipeline${limit ? `?limit=${limit}` : ''}`;
    const pipeLineData = await this.fetchWithRetry(uri, {
      method: 'POST',
      headers: this.withTokenHeader(),
      body: JSON.stringify(options),
    });
    return pipeLineData;
  }

  async batchLoanUpdate(options: BatchLoanUpdateContract): Promise<BatchUpdate> {
    const response: any = await this.fetchWithRetry('/loanBatch/updateRequests', {
      method: 'POST',
      body: JSON.stringify(options),
    }, { isNotJson: true });
    const requestId: string = response && response.headers
      ? response.headers.get('location').split('/').reverse()[0]
      : null;
    return {
      getRequestId: () => requestId,
      getUpdateStatus: async () => {
        const url = `/loanBatch/updateRequests/${requestId}`;
        const status: batchUpdateStatus = await this.fetchWithRetry(url);
        return status;
      },
    };
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    const response = await this.fetchWithRetry(url, options, { isNotJson: true });
    return response;
  }

  schemas = {
    generateContract: async (fields: any): Promise<any> => {
      const contract = await this.fetchWithRetry(
        '/schema/loan/contractGenerator',
        { method: 'POST', body: JSON.stringify(fields) },
      );
      return contract;
    },
    getLoanSchema: async (entities?: string[]): Promise<any> => {
      const entitiesString = entities ? entities.toString() : '';
      const url = `/schema/loan${entitiesString ? `?entities=${entitiesString}` : ''}`;
      const response = await this.fetchWithRetry(url);
      return response;
    },
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
    get: async (guid: string, entities?: string[]): Promise<any> => {
      const url = `/loans/${guid}${entities ? `?entities=${entities.toString()}` : ''}`;
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
      const url = `/loans/${guid}?${queryOptions}`;
      const fetchOptions: RequestInit = {
        method: 'PATCH',
        body: JSON.stringify(loanData),
      };
      await this.fetchWithRetry(url, fetchOptions, { isNotJson: true });
    },
    updateWithGeneratedContract: async (
      guid: string,
      loanData: UpdateLoanWithGenerateContract,
      options?: LoanUpdateOptions,
    ): Promise<void> => {
      const { customFields, standardFields } = loanData;
      const massagedCustomFields = massageCustomFields(customFields);
      const generatedContract: Promise<any> = await this.schemas.generateContract(standardFields);
      const generatedLoanData = { ...generatedContract, customFields: massagedCustomFields };
      await this.loans.update(guid, generatedLoanData, options);
    },
    delete: async (guid: string): Promise<void> => {
      await this.fetchWithRetry(
        `/loans/${guid}`,
        { method: 'DELETE' },
        { isNotJson: true },
      );
    },
  }

  milestones = {
    get: async (guid: string) => {
      const milestones: any[] = await this.fetchWithRetry(`/loans/${guid}/milestones`);
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
      await this.fetchWithRetry(`/loans/${loanGuid}/associates/${id}`, fetchOptions, { isNotJson: true });
    },
    update: async ({
      loanGuid,
      milestone,
      options,
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
      const uri = `/loans/${loanGuid}/milestones/${id}${action ? `?action=${action}` : ''}`;
      await this.fetchWithRetry(uri, fetchOptions, { isNotJson: true });
    },
  }
}

export default EncompassConnect;
