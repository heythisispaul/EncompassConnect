/* eslint-disable max-len */
/* eslint-disable camelcase */
import fetch, {
  Response,
  RequestInit,
  HeadersInit,
} from 'node-fetch';
import {
  EncompassConnectInitOptions,
  InternalRequestOptions,
  PipeLineContract,
  BatchLoanUpdateContract,
  AssignMilestoneOptions,
  UpdateMilestoneOptions,
  LoanUpdateOptions,
  batchUpdateStatus,
  UpdateLoanWithGenerateContract,
  BatchUpdate,
  TokenIntrospection,
} from './types';
import { massageCustomFields } from './utils';

class EncompassConnect {
  /**
   * The client ID of the Encompass instance to connect to.
   */
  #clientId: string;

  /**
   * The API key of the Encompass instance to connect to.
   */
  #APIsecret: string;

  /**
   * The Encompass instance ID of the instance to connect to.
   */
  #instanceId: string;

  /**
   * The password of the account to retrieve tokens with. Only stores the value provided to the constructor.
   */
  #password: string;

  /**
   * The bearer token that is used to authenticate each request to the Encompas API. The same token will be reused
   * until either a `401` is returned, or the value is overwritten with the `setToken()` or `getToken()` methods.
   */
  #token: string | null;

  /**
   * The username of the account to retrieve tokens with. Only stores the value provided to the constructor.
   */
  username: string;

  /**
   * The domain of the Encompass API.
   */
  base: string;

  /**
   * @ignore
   */
  authBase: string;

  /**
   * The version of the Encompass API to send requests to. Defaults to `1`.
   */
  version: number;

  constructor({
    clientId,
    APIsecret,
    instanceId,
    username,
    password,
    version = 1,
  }: EncompassConnectInitOptions) {
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

  /**
   * Replaces the `#token` property with the provided token value. The instance can be implicitly 'logged out' by setting this value to `null` (if it was not provided a username and password in the constructor).
   */
  setToken(token:string | null): void {
    this.#token = token;
  }

  /**
   * @ignore
   */
  private withTokenHeader(headers = {}): HeadersInit {
    return {
      ...headers,
      Authorization: `Bearer ${this.#token}`,
    };
  }

  /**
   * @ignore
   */
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

  /**
   * Exchanges the provided username and password for a bearer token and stores it to the `#token` property of the instance.
   * If no username and password are provided, it will fallback to the username and password values provided to the constructor.
   */
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

  /**
   * Calls the token introspection API with the provided token. If a token is not provided, it will introspect the token stored to the `#token` property of the instance as a fallback.
   * If the introspection returns a valid token, it will return the response body of the request, if the token is invalid, returns `null`.
   */
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

  /**
   * Returns the result of the 'Get Canonical Names' endpoint.
   */
  async getCanonicalNames(): Promise<any> {
    const canonicalNames = await this.fetchWithRetry('/loanPipeline/fieldDefinitions');
    return canonicalNames;
  }

  /**
    *  Generate a pipeline view by calling the `viewPipeline()` method. This method has one required argument, a `PipeLineContract`, and can optionally take a limit value as the second argument:
    *
    *  ```typescript
    *  // a pipelineContract expects either a loanGuids array, or a filter object:
    *  const commonFilterValues = {
    *    sortOrder: [
    *      {
    *        canonicalName: 'Loan.LastModified',
    *        order: 'desc'
    *      }
    *    ],
    *    fields: [
    *      "Loan.LoanAmount",
    *      "Fields.4002"
    *    ],
    *  };
    *
    *  const pipelineWithGuids: LoanGuidsPipeLineContract = {
    *    ...commonFilterValues,
    *    loanGuids: [
    *      'some-loan-guid-1',
    *      'some-loan-guid-2',
    *    ],
    *  };
    *
    *  const pipelineWithFilter: FilterPipeLineContract = {
    *    ...commonFilterValues,
    *    filter: {
    *      operator: 'and',
    *      terms: [
    *        {
    *          canonicalName: "Loan.LastModified",
    *          matchType: "greaterThanOrEquals",
    *          value: new Date()
    *        },
    *        {
    *          canonicalName: "Loan.LoanFolder",
    *          matchType: "exact",
    *          value: "My Pipeline"
    *        }
    *      ]
    *    },
    *  };
    *
    *  const pipelineDataFromGuids = await encompass.viewPipeline(pipelineWithGuids);
    *
    *  // or with the other contract, and a limit of the first 50 results:
    *  const pipelineDataFromFilter = await encompass.viewPipeline(pipelineWithFilter, 50);
    *  ```
    */
  async viewPipeline(options: PipeLineContract, limit?: number) {
    const uri = `/loanPipeline${limit ? `?limit=${limit}` : ''}`;
    const pipeLineData = await this.fetchWithRetry(uri, {
      method: 'POST',
      headers: this.withTokenHeader(),
      body: JSON.stringify(options),
    });
    return pipeLineData;
  }

  /**
    *  The batch update API allows your to apply the same loan data to multiple loans and can be invoked with `batchLoanUpdate()` method.
    *
    *  This method returns an object that with it's own functionality to check the status of batch update, or to get the request ID if needed.
    *
    *  Just like viewing a pipeline, either a filter or an array of lan GUIDs can be provided.
    *  ```typescript
    *  const updateData: BatchLoanUpdateContract = {
    *    loanGuids: [
    *      // array of loan GUIDs to update
    *    ],
    *    loanData: {
    *      // contract of the loan data to apply to each loan
    *    },
    *  };
    *
    *  const exampleBatchUpdate: BatchUpdate = await encompass.batchLoanUpdate(updateData);
    *
    *  // the return value can be used to check the status:
    *  const latestStatus: BatchUpdateStatus = await exampleBatchUpdate.getUpdateStatus();
    *  console.log(latestStatus.status) // 'done' or 'error'
    *
    *  // or if needed you can get the request ID itself:
    *  const exampleBatchUpdateId: string = exampleBatchUpdate.getRequestId();
    *  ```
    */
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

  /**
    * If an API is not available through an explicit method in this class, the `request()` method is a wrapper around fetch that allows you to request any Encompass API endpoint.
    *
    * It takes in the same arguments as any [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API, with the exception that the first argument is appended as a path to the Encompass API domain.
    * ```typescript
    * // hitting the Get Custom Fields API:
    * const customFieldsResponse: Response = await encompass.request('/settings/loan/customFields');
    * const data = await customFieldsResponse.json();
    * console.log(data);
    *
    * // or update a contact:
    * const options: RequestInit = {
    *   method: 'POST',
    *   body: {
    *     firstname: 'contact first name',
    *     lastname: 'contact last name',
    *   },
    * };
    * await encompass.request('/businessContacts/<some-contact-id>', options);
    * ```
    */
  async request(url: string, options: RequestInit): Promise<Response> {
    const response = await this.fetchWithRetry(url, options, { isNotJson: true });
    return response;
  }

  /**
   * A collection of methods that assist with schema operations.
   */
  schemas = {
    /**
     * Takes in a value representing key value pairs of field IDs and new values and returns the correct contract shape to perform an update on a loan.
     *
     * ```typescript
     *  const borrowerUpdateData = {
     *   '4000': 'new first name',
     *   '4002': 'new last name',
     *  };
     *
     *  // returns the contract:
     *  const updateContract = await encompass.schemas.generateContract(borrowerUpdateData);
     *  // this value can now be used to update a loan:
     *  await encompass.loans.update(updateContract);
     *  ```
     */
    generateContract: async (fields: any): Promise<any> => {
      const contract = await this.fetchWithRetry(
        '/schema/loan/contractGenerator',
        { method: 'POST', body: JSON.stringify(fields) },
      );
      return contract;
    },
    /**
     * Calls the loan schema endpoint and returns the schema. Can be filtered down by providing an optional array of entity names.
     */
    getLoanSchema: async (entities?: string[]): Promise<any> => {
      const entitiesString = entities ? entities.toString() : '';
      const url = `/schema/loan${entitiesString ? `?entities=${entitiesString}` : ''}`;
      const response = await this.fetchWithRetry(url);
      return response;
    },
  }

  /**
   * A collection of methods to use when working with loans. In general, these are wrappers around the 'Loan Management' API endpoints.
   */
  loans = {
    /**
     * Takes in a loan number (`Loan.LoanNumber`) and returns the matching loan's GUID. If no matching loan is found, returns `null`.
     */
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
    /**
     * Retrieves the loan data of the provided loan GUID. Can optionally be filtered by providing an array of entities.
     */
    get: async (guid: string, entities?: string[]): Promise<any> => {
      const url = `/loans/${guid}${entities ? `?entities=${entities.toString()}` : ''}`;
      const data: any = await this.fetchWithRetry(url);
      return data;
    },
    /**
      * Updates a loan object. Expects the data to already be formatted into the correct contract shape.
      *
      *  ```typescript
      *  const updateData: any = {
      *    applications: [
      *      borrower: {
      *        lastName: 'new borrower last name',
      *      },
      *    ],
      *    contacts: [
      *      {
      *        contactType: 'LOAN_OFFICER',
      *        name: 'new loan officer name',
      *      },
      *    ],
      *    customFields: [
      *      {
      *        fieldName: 'CX.SOME.CUSTOM.FIELD',
      *        stringValue: 'new value',
      *      },
      *    ],
      *  };
      *
      *  // using the default options:
      *  await encompass.loans.update('some-loan-guid', updateData);
      *
      *  // providing options:
      *  const options: LoanUpdateOptions = {
      *    appendData: true,
      *    persistent: 'transient',
      *    view: 'entity',
      *  };
      *
      *  await encompass.loans.update('some-loan-guid', updateData, options);
      *  ```
      */
    update: async (guid: string, loanData: any, options?: LoanUpdateOptions): Promise<void> => {
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
    /**
     * If the contract is not known, one can be generated before updating. The update data is expected as key value pairs (the key being the field ID), and all standard Encompass values are placed in the `standardFields` key, while all custom fields are placed in the `customFields` key.
     *
     *  ```typescript
     *  const updateData: UpdateLoanWithGenerateContract = {
     *    standardFields: {
     *      '4000': 'new borrower last name',
     *      '317': 'new loan officer name',
     *    },
     *    customFields: {
     *      'CX.SOME.CUSTOM.FIELD': 'new value',
     *    },
     *  };
     *
     *  await encompass.loans.updateWithGeneratedContract('some-loan-guild', updateData);
     *  ```
     *
     *  The `updateWithGeneratedContract()` method can also take the third `LoanUpdateOptions` as well.
     *  Keep in mind this method requires an extra call to generate the contract, and `loans.update()` should be used instead when possible.
     */
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
    /**
     * Deletes the loan that matches the provided GUID.
     */
    delete: async (guid: string): Promise<void> => {
      await this.fetchWithRetry(
        `/loans/${guid}`,
        { method: 'DELETE' },
        { isNotJson: true },
      );
    },
  }

  /**
   * A collection of methods when working with milestones and associates.
   */
  milestones = {
    /**
     * Returns the response of the Get All Milestone endpoints for the provided GUID.
     */
    get: async (guid: string): Promise<any[]> => {
      const milestones: any[] = await this.fetchWithRetry(`/loans/${guid}/milestones`);
      return milestones;
    },
    /**
      * Assigns a loan associate to a milestone. The associate ID provided must be of a user who fits the persona group for that milestone.
      *
      * ```typescript
      *  const guidToUpdate: string = 'some-loan-guid';
      *  const assignUnderwriterOptions: AssignMilestoneOptions = {
      *    loanGuid: guidToUpdate,
      *    milestone: 'Underwriting',
      *    userId: 'UnderwritersId',
      *  };
      *
      *  await encompass.milestones.assign(assignUnderwriterOptions);
      *  ```
      */
    assign: async ({
      milestone,
      userId,
      loanGuid,
    }: AssignMilestoneOptions): Promise<void> => {
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
    /**
      *  Updates the matching milestone for the loan guid provided. The `options` key will be added to the body of the call, and the optional `action` key can be used to finish or unfinish a milestone.
      *
      *  ```typescript
      *  const updateProcessingOptions: UpdateMilestoneOptions = {
      *    loanGuid: guidToUpdate,
      *    milestone: 'Processing',
      *    options: {
      *      comments: 'this milestone is complete!',
      *    }
      *    action: 'finish',
      *  };
      *
      *  await encompass.milestones.update(updateProcessingOptions);
      *  ```
      */
    update: async ({
      loanGuid,
      milestone,
      options,
      action,
    }: UpdateMilestoneOptions): Promise<void> => {
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
