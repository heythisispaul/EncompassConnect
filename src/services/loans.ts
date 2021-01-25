/* eslint-disable max-len */
import { RequestInit } from 'node-fetch';
import EncompassService from './service';
import {
  LoanUpdateOptions,
  UpdateLoanWithGenerateContract,
  FieldReaderResult,
} from '../types';
import { massageCustomFields, objectToURLString, reduceFieldReaderValues } from '../utils';

class LoansService extends EncompassService {
  /**
   * Takes in a loan number (`Loan.LoanNumber`) and returns the matching loan's GUID. If no matching loan is found, returns `null`.
   */
  async getGuidByLoanNumber(loanNumber: string): Promise<string> {
    const [loanResult] = await this.context.viewPipeline({
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
  }

  /**
     * Retrieves the loan data of the provided loan GUID. Can optionally be filtered by providing an array of entities.
     */
  async get(guid: string, entities?: string[]): Promise<any> {
    const url = `/loans/${guid}${entities ? `?entities=${entities.toString()}` : ''}`;
    const data: any = await this.context.fetchWithRetry(url);
    return data;
  }

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
  async update(guid: string, loanData: any, options?: LoanUpdateOptions): Promise<void> {
    const defaultOptions = [
      ['appendData', 'false'],
      ['persistent', 'transient'],
      ['view', 'entity'],
    ];
      // @ts-ignore
    const queryOptions = objectToURLString(options || defaultOptions, true);
    const url = `/loans/${guid}${queryOptions}`;
    const fetchOptions: RequestInit = {
      method: 'PATCH',
      body: JSON.stringify(loanData),
    };
    await this.context.fetchWithRetry(url, fetchOptions, { isNotJson: true });
  }

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
  async updateWithGeneratedContract(
    guid: string,
    loanData: UpdateLoanWithGenerateContract,
    options?: LoanUpdateOptions,
  ): Promise<void> {
    const { customFields, standardFields } = loanData;
    const massagedCustomFields = massageCustomFields(customFields);
    const generatedContract: Promise<any> = await this.context.schemas.generateContract(standardFields);
    const generatedLoanData = { ...generatedContract, customFields: massagedCustomFields };
    await this.update(guid, generatedLoanData, options);
  }

  /**
   * Deletes the loan that matches the provided GUID.
   */
  async delete(guid: string): Promise<void> {
    await this.context.fetchWithRetry(
      `/loans/${guid}`,
      { method: 'DELETE' },
      { isNotJson: true },
    );
  }

  /**
   * Takes in a loan guid and an array of field names, and returns the result of the 'Loan: Field Reader' result. The third argument is an optional object that
   * contains two configuration options:
   *  1. `includeMetadata` - setting this to `true` will include the metadata keys on each fieldReader object in the response
   *  2. `mapResponse` - setting this to `true` will reduce the return value to a single object with each key being the field ID, and its value the field's value (as a string).
   *
   * ```typescript
   * const fieldValues = await encompass.loans.fieldReader('some-loan-guid', ['4000', '4002'], {
   *  includeMetadata: true,
   *  mapResponse: false,
   * });
   * ```
   */
  async fieldReader(
    guid: string,
    fields: string[],
    { mapResponse, includeMetadata }: { mapResponse?: boolean, includeMetadata?: boolean } = {},
  ): Promise<FieldReaderResult[] | { [key: string]: string }> {
    const query = includeMetadata ? '?includeMetadata=true' : '';
    const fieldValueArray: FieldReaderResult[] = await this.context.fetchWithRetry(
      `/loans/${guid}/fieldReader${query}`,
      { method: 'POST', body: JSON.stringify(fields) },
    );
    return mapResponse ? reduceFieldReaderValues(fieldValueArray) : fieldValueArray;
  }
}

export default LoansService;
