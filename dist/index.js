"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
class EncompassConnect {
    constructor(clientId, APIsecret, instanceId) {
        this.utils = {
            callInfo: (method, body) => {
                let options = {
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
            getMilestoneId: (GUID, milestone) => {
                return new Promise((resolve, reject) => {
                    let milestoneId = '';
                    request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones`, this.utils.callInfo('GET'), (err, response, body) => {
                        if (err) {
                            reject(err);
                        }
                        try {
                            milestoneId = body.filter((ms) => ms.milestoneName == milestone)[0].id;
                            resolve(milestoneId);
                        }
                        catch (_a) {
                            reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                        }
                    });
                });
            },
            tokenOptions: (method, token, username, password) => {
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
                };
            },
            contractGenerator: (fields, generate) => {
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
        };
        this.authenticate = (username, password) => {
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
        };
        this.tokenIntrospect = (token) => {
            return new Promise((resolve, reject) => {
                request(`https://api.elliemae.com/oauth2/v1/token/introspection`, this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.revokeToken = (token) => {
            return new Promise((resolve, reject) => {
                request('https://api.elliemae.com/oauth2/v1/token/revocation', this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.storeToken = (token) => {
            this.token = token;
        };
        this.customRequest = (uri, method, body) => {
            return new Promise((resolve, reject) => {
                request(uri, this.utils.callInfo(method ? method : 'GET', body ? body : undefined), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.getGuid = (loanNumber) => {
            let guidFilter = {
                filter: {
                    operator: "and",
                    terms: [{
                            canonicalName: "Loan.LoanNumber",
                            value: loanNumber,
                            matchType: "exact"
                        }]
                },
                fields: ["Loan.GUID"]
            };
            return new Promise((resolve, reject) => {
                request('https://api.elliemae.com/encompass/v1/loanPipeline/', this.utils.callInfo('POST', guidFilter), (err, response) => {
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
        };
        //not yet in readme
        this.pipeLineView = (options, limit) => {
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
        };
        //loan CRUD
        this.getLoan = (GUID, loanEntities) => {
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
        };
        this.updateLoan = (GUID, loanData, generateContract = true, loanTemplate) => {
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
                });
            });
        };
        this.deleteLoan = (GUID) => {
            return new Promise((resolve, reject) => {
                request(`https://api.elliemae.com/encompass/v1/loans/${GUID}`, this.utils.callInfo('DELETE'), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        //still need create
        //end loan CRUD
        this.assignUserToMilestone = (GUID, milestone, userProperties) => {
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
        };
        this.completeMilestone = (GUID, milestone) => {
            return new Promise((resolve, reject) => {
                this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                    request(`https://api.elliemae.com/encompass/v1/loans/${GUID}/milestones/${milestoneId}?action=finish`, this.utils.callInfo('PATCH', { milestoneName: milestone }), (err, response, body) => {
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
        };
        //this not right maybe? still needs tests ran 10-26
        this.updateRoleFreeMilestone = (GUID, milestone, userProperties) => {
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
                        resolve(response);
                    });
                })
                    .catch((err) => {
                    reject(err);
                });
            });
        };
        //needs testing as well 10/26
        this.batchUpdate = (options, loanData, generateContract = true) => {
            return new Promise((resolve, reject) => {
                this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                    let batchOptions = { loanData: contract };
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
                });
            });
        };
        //any time a parameter object is provided it comes back as an empty array no matter what:
        this.users = {
            listOfUsers: (queryParameters) => {
                let uri = 'https://api.elliemae.com/encompass/v1/company/users';
                if (queryParameters) {
                    uri += `?viewEmailSignature=${queryParameters.viewEmailSignature ? 'true' : 'false'}`;
                    uri += queryParameters.hasOwnProperty('start') ? `&start=${queryParameters.start}` : '';
                    uri += queryParameters.hasOwnProperty('limit') ? `&limit=${queryParameters.limit}` : '';
                }
                if (queryParameters && queryParameters.filter) {
                    let filters = queryParameters.filter;
                    Object.keys(queryParameters.filter).forEach((filter) => {
                        let filterString = `&${filter}=`;
                        filters[filter].forEach((param) => {
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
                    });
                });
            },
            userProfile: (userId) => {
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
            userLicenses: (userId, state) => {
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
                    });
                });
            }
        };
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instanceId;
        this.token = '';
    }
}
exports.default = EncompassConnect;
