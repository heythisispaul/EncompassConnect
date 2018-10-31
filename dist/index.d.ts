import * as request from 'request';
import { PipeLineContract, LoanAssociateProperties, PipeLineFilter, UserInfoContract, LicenseInformation, UserProfile } from './encompassInterfaces';
export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;
    token: string;
    constructor(clientId: string, APIsecret: string, instanceId: string);
    private root;
    private utils;
    authenticate: (username: string, password: string) => Promise<request.Response>;
    tokenIntrospect: (token?: string | undefined) => Promise<request.Response>;
    revokeToken: (token?: string | undefined) => Promise<request.Response>;
    storeToken: (token: string) => void;
    customRequest: (uri: string, method?: string | undefined, body?: any) => Promise<request.Response>;
    getGuid: (loanNumber: string) => Promise<string>;
    pipeLineView: (options: PipeLineContract, limit?: number | undefined) => Promise<any[]>;
    getLoan: (GUID: string, loanEntities?: string[] | undefined) => Promise<any>;
    updateLoan: (GUID: string, loanData: any, generateContract?: boolean, loanTemplate?: string | undefined) => Promise<request.Response>;
    deleteLoan: (GUID: string) => Promise<request.Response>;
    batchUpdate: (options: string[] | PipeLineFilter, loanData: any, generateContract?: boolean) => Promise<request.Response>;
    milestones: {
        assignUser: (GUID: string, milestone: string, userProperties: LoanAssociateProperties) => Promise<request.Response>;
        complete: (GUID: string, milestone: string) => Promise<request.Response>;
        updateRoleFree: (GUID: string, milestone: string, userProperties: LoanAssociateProperties) => Promise<request.Response>;
        all: (GUID: string) => Promise<any[]>;
        associate: (GUID: string, milestone: string) => Promise<LoanAssociateProperties>;
    };
    users: {
        listOfUsers: (queryParameters?: UserInfoContract | undefined) => Promise<UserProfile[]>;
        userProfile: (userId: string) => Promise<UserProfile>;
        userLicenses: (userId: string, state?: string | undefined) => Promise<LicenseInformation[]>;
    };
}
