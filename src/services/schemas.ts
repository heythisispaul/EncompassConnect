/* eslint-disable max-len */
import EncompassService from './service';

class SchemaService extends EncompassService {
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
  async generateContract(fields: any): Promise<any> {
    const contract = await this.context.fetchWithRetry(
      '/schema/loan/contractGenerator',
      { method: 'POST', body: JSON.stringify(fields) },
    );
    return contract;
  }

  /**
   * Calls the loan schema endpoint and returns the schema. Can be filtered down by providing an optional array of entity names.
   */
  async getLoanSchema(entities?: string[]): Promise<any> {
    const entitiesString = entities ? entities.toString() : '';
    const url = `/schema/loan${entitiesString ? `?entities=${entitiesString}` : ''}`;
    const response = await this.context.fetchWithRetry(url);
    return response;
  }
}

export default SchemaService;
