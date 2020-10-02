/* eslint-disable max-len */
import EncompassService from './service';
import { AssignMilestoneOptions, UpdateMilestoneOptions } from '../types';

class MilestoneService extends EncompassService {
  /**
   * Returns the response of the Get All Milestone endpoints for the provided GUID.
   */
  async get(guid: string): Promise<any[]> {
    const milestones: any[] = await this.context.fetchWithRetry(`/loans/${guid}/milestones`);
    return milestones;
  }

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
  async assign({
    milestone,
    userId,
    loanGuid,
  }: AssignMilestoneOptions): Promise<void> {
    const milestoneData = await this.get(loanGuid);
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
    await this.context.fetchWithRetry(`/loans/${loanGuid}/associates/${id}`, fetchOptions, { isNotJson: true });
  }

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
  async update({
    loanGuid,
    milestone,
    options,
    action,
  }: UpdateMilestoneOptions): Promise<void> {
    const milestoneData = await this.get(loanGuid);
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
    await this.context.fetchWithRetry(uri, fetchOptions, { isNotJson: true });
  }
}

export default MilestoneService;
