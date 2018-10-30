import * as request from 'request';
import { PipeLineContract, LoanAssociateProperties, PipeLineFilter, UserInfoContract, LicenseInformation, UserProfile } from './encompassInterfaces';
import { RequestOptions } from 'https';

export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;
    token: string;

    constructor(clientId: string, APIsecret: string, instanceId: string) {
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instanceId;
        this.token = '';
    }

    private utils = {
        callInfo: (method: string, body?: any): RequestOptions => {
            let options: any = {
                method: method,
                headers: {
                    "Authorization": 'Bearer ' + this.token
                },
                dataType: 'text',
                contentType: 'application/x-www-form-urlencoded',
                json: true
            };
            if (body) {
                options.body = body;
            }
            return options;
        },
        getMilestoneId: (GUID: string, milestone: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                let milestoneId: string = '';
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones`, this.utils.callInfo('GET'), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    try {
                        milestoneId = body.filter((ms: any) => ms.milestoneName == milestone)[0].id;
                        resolve(milestoneId);
                    }
                    catch {
                        reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                    }
                });
            })
        },
        tokenOptions: (method: string, token?: string | undefined, username?: string, password?: string): any => {
            let dataString = `token=${this.token}`;
            let auth = "Basic " + Buffer.from(this.clientId + ":" + this.APIsecret).toString('base64');
            if (username || password) {
                dataString = `grant_type=password&username=${username}@encompass:${this.instanceId}&password=${password}`;
            }
            return {
                method: method,
                json: true,
                headers: {
                    "Authorization": auth,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: dataString
            }
        },
        contractGenerator: (fields: any, generate: boolean): Promise<request.RequestResponse> => {
            return new Promise((resolve, reject) => {
                if (!generate) {
                    resolve(fields);
                }
                request('https://api.elliemae.com/encompass/v1/schema/loan/contractGenerator', this.utils.callInfo('POST', fields), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response.body);
                });
            });
        }
    }

    authenticate = (username: string, password: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/oauth2/v1/token', this.utils.tokenOptions('POST', undefined, username, password), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                if (response.body.access_token) {
                    this.token = response.body.access_token;
                    resolve(response);
                }
                reject('Token request was not rejected - however no token was returned');
            });
        });
    }

    tokenIntrospect = (token?: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(`https://api.elliemae.com/oauth2/v1/token/introspection`, this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            })
        })
    }

    revokeToken = (token?: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/oauth2/v1/token/revocation', this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            })
        })
    }

    storeToken = (token: string): void => {
        this.token = token;
    }

    customRequest = (uri: string, method?: string, body?: any): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo(method ? method : 'GET', body ? body : undefined), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            });
        });
    }

    getGuid = (loanNumber: string): Promise<string> => {

        let guidFilter: PipeLineContract = {
            filter: {
                operator: "and",
                terms: [{
                  canonicalName: "Loan.LoanNumber",
                  value: loanNumber,
                  matchType: "exact"
              }]
            },
            fields: ["Loan.GUID"]
        }

        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/encompass/v1/loanPipeline/', this.utils.callInfo('POST', guidFilter), (err: Error, response: request.RequestResponse) => {
                if (err) {
                    reject(err);
                }
                if (response.body.length > 0) {
                    resolve(response.body[0].loanGuid);
                }
                else {
                    reject(`Loan ${loanNumber} did not return a matching GUID`);
                }
            });
        });
    }

    //not yet in readme
    pipeLineView = (options: PipeLineContract, limit?: number): Promise<any[]> => {
        let requestOptions = this.utils.callInfo('POST', options);
        let uri = 'https://api.elliemae.com/encompass/v1/loanPipeline/';
        if (limit) {
            uri += `?limit=${limit.toString()}`;
        }
        return new Promise((resolve, reject) => {
            request(uri, requestOptions, (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    //loan CRUD
    getLoan = (GUID: string, loanEntities?: string[]): Promise<any> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/${GUID}`;
        if (loanEntities) {
            uri += '?entities=';
            loanEntities.forEach((item) => {
                uri += item + ',';
            });
            uri = uri.substring(0, uri.length - 1);
        }
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo('GET'), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response.body);
            });
        });
    }

    updateLoan = (GUID: string, loanData: any, generateContract: boolean = true, loanTemplate?: string): Promise<request.RequestResponse> => {
        let uri = `https://api.elliemae.com/encompass/v1/loans/${GUID}?appendData=true`;
        if (loanTemplate) {
            uri += '?loanTemplate=' + loanTemplate;
        }
        return new Promise((resolve, reject) => {
            this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                request(uri, this.utils.callInfo('PATCH', contract), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    if (response.body) {
                        reject(response.body);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            })
        });
    }

    deleteLoan = (GUID: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(`https://api.elliemae.com/encompass/v1/loans/${GUID}`, this.utils.callInfo('DELETE'), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            });
        });
    }

    //still need create
    //end loan CRUD

    assignUserToMilestone = (GUID: string, milestone: string, userProperties: LoanAssociateProperties): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/associates/${milestoneId}`, this.utils.callInfo('PUT', userProperties), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    completeMilestone = (GUID: string, milestone: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones/${milestoneId}?action=finish`, this.utils.callInfo('PATCH', { milestoneName: milestone }), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    if (response.body) {
                        reject(response.body);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    //this not right maybe? still needs tests ran 10-26
    updateRoleFreeMilestone = (GUID: string, milestone: string, userProperties: LoanAssociateProperties): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                let options = {
                    loanAssociate: {
                        loanAssociateType: userProperties.loanAssociateType,
                        userId: userProperties.id
                    }
                };

                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestoneFreeRoles/${milestoneId}`, this.utils.callInfo('PATCH', options), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    if (response.body) {
                        reject(response.body);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    //needs testing as well 10/26
    batchUpdate = (options: PipeLineFilter | string[], loanData: any, generateContract: boolean = true): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                let batchOptions: any = { loanData: contract };
                batchOptions[Array.isArray(options) ? 'loanGuids' : 'filter'] = options;
                request('https://api.elliemae.com/encompass/v1/loanBatch/updateRequests', this.utils.callInfo('POST', batchOptions), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            })
            .catch((err) => {
                reject(err);
            })
        })
    }

    public users = {
        listOfUsers: (queryParameters?: UserInfoContract): Promise<UserProfile[]> => {
            let uri = 'https://api.elliemae.com/encompass/v1/company/users';
            if (queryParameters) {
                uri += `?viewEmailSignature=${queryParameters.viewEmailSignature ? 'true' : 'false'}`;
                uri += queryParameters.hasOwnProperty('start') ? `&start=${queryParameters.start}` : '';
                uri += queryParameters.hasOwnProperty('limit') ? `&limit=${queryParameters.limit}` : '';
            }
            if (queryParameters && queryParameters.filter) {
                let filters: any = queryParameters.filter;
                Object.keys(queryParameters.filter).forEach((filter: string) => {
                    let filterString = `&${filter}=`;
                    filters[filter].forEach((param: any) => {
                        filterString += `${param},`;
                    });
                    uri += filterString.substring(0, filterString.length - 1);
                });
            }
            return new Promise((resolve, reject) => {
                request(uri, this.utils.callInfo('GET'), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response.body);
                })
            })
        },
        userProfile: (userId: string): Promise<UserProfile> => {
            return new Promise((resolve, reject) => {
                request(`https://api.elliemae.com/encompass/v1/company/users/${userId}`, this.utils.callInfo('GET'), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    if (response.body.errorCode) {
                        reject(response.body);
                    }
                    resolve(response.body);
                });
            });
        },
        userLicenses: (userId: string, state?: string): Promise<LicenseInformation[]> => {
            let uri = `https://api.elliemae.com/encompass/v1/company/users/${userId}/licenses`;
            return new Promise((resolve, reject) => {
                request(state ? uri + `?state=${state}` : uri, this.utils.callInfo('GET'), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    if (response.body.errorCode) {
                        reject(response.body);
                    }
                    resolve(response.body);
                })
            });
        }
    }
}