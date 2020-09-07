"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _clientId, _APIsecret, _instanceId, _password, _token;
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable camelcase */
const node_fetch_1 = require("node-fetch");
class EncompassConnect {
    constructor({ clientId, APIsecret, instanceId, username, password, }) {
        _clientId.set(this, void 0);
        _APIsecret.set(this, void 0);
        _instanceId.set(this, void 0);
        _password.set(this, void 0);
        _token.set(this, void 0);
        this.loans = {
            getGuidByLoanNumber: (loanNumber) => __awaiter(this, void 0, void 0, function* () {
                const [loanResult] = yield this.viewPipeline({
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
            }),
            get: (guid, entities) => __awaiter(this, void 0, void 0, function* () {
                const url = `/encompass/v1/loans/${guid}${entities ? `?entities=${entities.toString()}` : ''}`;
                const data = yield this.fetchWithRetry(url);
                return data;
            }),
            update: (guid, loanData, options) => __awaiter(this, void 0, void 0, function* () {
                const defaultOptions = [
                    ['appendData', 'false'],
                    ['persistent', 'transient'],
                    ['view', 'entity'],
                ];
                // @ts-ignore
                const queryOptions = new URLSearchParams(options || defaultOptions).toString();
                const url = `/encompass/v1/loans/${guid}?${queryOptions}`;
                const fetchOptions = {
                    method: 'PATCH',
                    body: JSON.stringify(loanData),
                };
                const data = yield this.fetchWithRetry(url, fetchOptions);
                return data;
            }),
            delete: (guid) => __awaiter(this, void 0, void 0, function* () {
                yield this.fetchWithRetry(`/encompass/v1/loans/${guid}`, { method: 'DELETE' }, { isNotJson: true });
            }),
        };
        this.milestones = {
            get: (guid) => __awaiter(this, void 0, void 0, function* () {
                const milestones = yield this.fetchWithRetry(`/encompass/v1/loans/${guid}/milestones`);
                return milestones;
            }),
            assign: ({ milestone, userId, loanGuid, }) => __awaiter(this, void 0, void 0, function* () {
                const milestoneData = yield this.milestones.get(loanGuid);
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
                yield this.fetchWithRetry(`/encompass/v1/loans/${loanGuid}/associates/${id}`, fetchOptions, { isNotJson: true });
            }),
            update: ({ loanGuid, milestone, options = {}, action, }) => __awaiter(this, void 0, void 0, function* () {
                const milestoneData = yield this.milestones.get(loanGuid);
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
                yield this.fetchWithRetry(uri, fetchOptions, { isNotJson: true });
            }),
        };
        __classPrivateFieldSet(this, _clientId, clientId);
        __classPrivateFieldSet(this, _APIsecret, APIsecret);
        __classPrivateFieldSet(this, _instanceId, instanceId);
        __classPrivateFieldSet(this, _password, password || '');
        __classPrivateFieldSet(this, _token, '');
        this.username = username || '';
        this.base = 'https://api.elliemae.com';
    }
    setToken(token) {
        __classPrivateFieldSet(this, _token, token);
    }
    withTokenHeader(headers = {}) {
        return Object.assign(Object.assign({}, headers), { Authorization: `Bearer ${__classPrivateFieldGet(this, _token)}` });
    }
    fetchWithRetry(path, options = {}, customOptions = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { isRetry, isNotJson } = customOptions;
            const failedAuthError = new Error(`Token invalid. ${!isRetry ? 'Will reattempt with new token' : 'Unable to get updated one.'}`);
            try {
                if (!__classPrivateFieldGet(this, _token)) {
                    yield this.getToken();
                }
                const url = `${this.base}${path}`;
                const optionsWithToken = Object.assign(Object.assign({}, options), { headers: this.withTokenHeader(options.headers) });
                const response = yield node_fetch_1.default(url, optionsWithToken);
                if (response.status === 401) {
                    throw failedAuthError;
                }
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return isNotJson ? response : yield response.json();
            }
            catch (error) {
                if (!isRetry && error === failedAuthError) {
                    this.setToken(null);
                    return this.fetchWithRetry(path, options, Object.assign(Object.assign({}, customOptions), { isRetry: true }));
                }
                throw error;
            }
        });
    }
    getToken(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = new URLSearchParams({
                grant_type: 'password',
                username: `${username || this.username}@encompass:${__classPrivateFieldGet(this, _instanceId)}`,
                password: password || __classPrivateFieldGet(this, _password),
                client_id: __classPrivateFieldGet(this, _clientId),
                client_secret: __classPrivateFieldGet(this, _APIsecret),
            }).toString();
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
                redirect: 'follow',
            };
            const response = yield node_fetch_1.default(`${this.base}/oauth2/v1/token`, requestOptions);
            const { access_token } = yield response.json();
            this.setToken(access_token);
        });
    }
    getCanonicalNames() {
        return __awaiter(this, void 0, void 0, function* () {
            const canonicalNames = yield this.fetchWithRetry('/encompass/v1/loanPipeline/fieldDefinitions');
            return canonicalNames;
        });
    }
    viewPipeline(options, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = `/encompass/v1/loanPipeline${limit ? `?limit=${limit}` : ''}`;
            const pipeLineData = yield this.fetchWithRetry(uri, {
                method: 'POST',
                headers: this.withTokenHeader(),
                body: JSON.stringify(options),
            });
            return pipeLineData;
        });
    }
    batchLoanUpdate(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchWithRetry('/encompass/v1/loanBatch/updateRequests', {
                method: 'POST',
                body: JSON.stringify(options),
            }, { isNotJson: true });
            return response && response.headers && response.headers.location
                ? response.headers.location.split('/').reverse()[0]
                : null;
        });
    }
}
_clientId = new WeakMap(), _APIsecret = new WeakMap(), _instanceId = new WeakMap(), _password = new WeakMap(), _token = new WeakMap();
exports.default = EncompassConnect;
