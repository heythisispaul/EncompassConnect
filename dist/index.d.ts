/// <reference types="node" />
import * as request from 'request';
import { LoanAssociateProperties, PipeLineFilter, UserInfoContract, LicenseInformation, UserProfile, CreateLoanContract, FilterPipeLineContract, LoanGuidsPipeLineContract } from './encompassInterfaces';
import { RequestOptions } from 'https';
export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;
    token: string;
    constructor(clientId: string, APIsecret: string, instanceId: string);
    private root;
    utils: {
        handleResponse: (resolve: any, reject: any, err: Error, response: request.Response, override?: any) => void;
        strictURI: (uriComponent: string) => string;
        callInfo: (method: string, body?: any) => RequestOptions;
        getMilestoneId: (GUID: string, milestone: string) => Promise<string>;
        tokenOptions: (method: string, token?: string | undefined, username?: string | undefined, password?: string | undefined) => any;
        numberCheck: (value: string | number) => number | undefined;
        contractGenerator: (fields: any, generate: boolean) => Promise<request.Response>;
    };
    authenticate: (username: string, password: string) => Promise<request.Response>;
    tokenIntrospect: (token?: string | undefined) => Promise<request.Response>;
    revokeToken: (token?: string | undefined) => Promise<request.Response>;
    storeToken: (token: string) => void;
    customRequest: (uri: string, method?: string | undefined, body?: any) => Promise<request.Response>;
    getGuid: (loanNumber: string) => Promise<string>;
    pipeLineView: (options: LoanGuidsPipeLineContract | FilterPipeLineContract, limit?: number | undefined) => Promise<any[]>;
    getLoan: (GUID: string, loanEntities?: string[] | undefined) => Promise<any>;
    updateLoan: (GUID: string, loanData: any, generateContract?: boolean, loanTemplate?: string | undefined) => Promise<request.Response>;
    deleteLoan: (GUID: string) => Promise<request.Response>;
    createLoan: (createLoanContract?: CreateLoanContract | undefined) => Promise<{}>;
    batchUpdate: (options: string[] | PipeLineFilter, loanData: any, generateContract?: boolean) => Promise<request.Response>;
    moveLoan: (GUID: string, folderName: string) => Promise<{}>;
    milestones: {
        assign: (GUID: string, milestone: string, userProperties: LoanAssociateProperties) => Promise<request.Response>;
        complete: (GUID: string, milestone: string) => Promise<request.Response>;
        updateRoleFree: (GUID: string, milestone: string, userProperties: LoanAssociateProperties) => Promise<request.Response>;
        all: (GUID: string) => Promise<any[]>;
        associate: (GUID: string, milestone: string) => Promise<LoanAssociateProperties>;
    };
    users: {
        list: (UserInfoContract?: UserInfoContract | undefined) => Promise<UserProfile[]>;
        profile: (userId: string) => Promise<UserProfile>;
        licenses: (userId: string, state?: string | undefined) => Promise<LicenseInformation[]>;
    };
}
