(function() {
    const originalFetch = window.fetch ? window.fetch.bind(window) : null;
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalWebSocket = window.WebSocket;

    const solutionUid = '019d7a32-f1c7-7812-807a-b7438ffa1d40';
    const roleId = '2';

    const fixtureMap = [
        {
            match: (url) => url.pathname === `/backend/v2/solutions/${solutionUid}/blockly`,
            fixture: '../../docs/fixtures-solution-blockly.json'
        },
        {
            match: (url) => url.pathname === '/backend/v1/version_control',
            fixture: '../../docs/fixtures-version-control.json'
        },
        {
            match: (url) => url.pathname === '/backend/v1/topology1/multilanguage_by_module',
            fixture: '../../docs/fixtures-multilang.json'
        },
        {
            match: (url) => url.pathname === '/backend/v2/devices/tree',
            fixture: '../../docs/fixtures-devices-tree.json'
        },
        {
            match: (url) => url.pathname === '/backend/v2/companies/1/device-types',
            fixture: '../../docs/fixtures-device-types.json'
        },
        {
            match: (url) => url.pathname === `/backend/v2/solutions/${solutionUid}/topologies`,
            fixture: '../../docs/fixtures-topologies.json'
        },
        {
            match: (url) => url.pathname === '/backend/v1/device-models/config-uis',
            fixture: '../../docs/fixtures-config-uis.json'
        },
        {
            match: (url) => url.pathname === `/backend/v1/roles/${roleId}`,
            fixture: '../../docs/fixtures-role-2.json'
        }
    ];

    const genericOk = {
        code: 0,
        data: {}
    };

    const runOk = {
        code: 0,
        data: {
            success: true
        }
    };

    function normalizeUrl(input) {
        return new URL(input, window.location.href);
    }

    function resolveFixture(url, method) {
        const normalizedMethod = (method || 'GET').toUpperCase();
        const directMatch = fixtureMap.find((entry) => entry.match(url, normalizedMethod));
        if (directMatch) return { type: 'fixture', value: directMatch.fixture };

        if (url.pathname.startsWith('/middle/python-code')) return { type: 'json', value: runOk };
        if (url.pathname.startsWith('/middle/python-code-dds')) return { type: 'json', value: runOk };
        if (url.pathname.startsWith('/backend/v1/blockly-zone-datas')) return { type: 'json', value: runOk };
        if (url.pathname === '/backend/v2/blockly-zone-datas') return { type: 'json', value: runOk };
        if (url.pathname.startsWith('/backend/v1/rt/program_method_result/')) return { type: 'json', value: genericOk };
        if (url.pathname.startsWith('/backend/v1/rt/block_methods/')) return { type: 'json', value: genericOk };
        if (url.pathname === '/backend/stand-alone/config') return { type: 'json', value: genericOk };
        if (url.pathname === '/backend/stand-alone/blockly') return { type: 'fixture', value: '../../docs/fixtures-solution-blockly.json' };
        return null;
    }

    async function loadMockPayload(url, method) {
        const resolved = resolveFixture(url, method);
        if (!resolved) return null;
        if (resolved.type === 'json') return resolved.value;
        const response = await originalFetch(resolved.value, { credentials: 'same-origin' });
        return response.json();
    }

    async function maybeMockFetch(input, init) {
        const url = normalizeUrl(typeof input === 'string' ? input : input.url);
        const method = init?.method || (typeof input === 'object' && input.method) || 'GET';
        const payload = await loadMockPayload(url, method);
        if (payload === null) return null;
        return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    if (originalFetch) {
        window.fetch = async function(input, init) {
            const mocked = await maybeMockFetch(input, init);
            if (mocked) return mocked;
            return originalFetch(input, init);
        };
    }

    function MockXHR() {
        this.xhr = new OriginalXHR();
        this.method = 'GET';
        this.url = '';
        this.async = true;
        this.readyState = 0;
        this.status = 0;
        this.responseText = '';
        this.response = '';
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
        this.onabort = null;
        this._headers = {};
    }

    MockXHR.prototype.open = function(method, url, async = true) {
        this.method = method;
        this.url = url;
        this.async = async !== false;
        this.readyState = 1;
        if (this.onreadystatechange) this.onreadystatechange();
    };

    MockXHR.prototype.setRequestHeader = function(key, value) {
        this._headers[key] = value;
    };

    MockXHR.prototype.getAllResponseHeaders = function() {
        return 'content-type: application/json';
    };

    MockXHR.prototype.getResponseHeader = function(name) {
        if (String(name).toLowerCase() === 'content-type') return 'application/json';
        return null;
    };

    MockXHR.prototype.send = function() {
        const url = normalizeUrl(this.url);
        loadMockPayload(url, this.method).then((payload) => {
            if (payload !== null) {
                this.status = 200;
                this.readyState = 4;
                this.responseText = JSON.stringify(payload);
                this.response = this.responseText;
                if (this.onreadystatechange) this.onreadystatechange();
                if (this.onload) this.onload();
                return;
            }

            this.xhr.onreadystatechange = () => {
                this.readyState = this.xhr.readyState;
                this.status = this.xhr.status;
                this.responseText = this.xhr.responseText;
                this.response = this.xhr.response;
                if (this.onreadystatechange) this.onreadystatechange();
            };
            this.xhr.onload = () => {
                this.status = this.xhr.status;
                this.responseText = this.xhr.responseText;
                this.response = this.xhr.response;
                if (this.onload) this.onload();
            };
            this.xhr.onerror = (event) => {
                if (this.onerror) this.onerror(event);
            };
            this.xhr.onabort = (event) => {
                if (this.onabort) this.onabort(event);
            };
            this.xhr.open(this.method, this.url, this.async);
            Object.entries(this._headers).forEach(([key, value]) => this.xhr.setRequestHeader(key, value));
            this.xhr.send.apply(this.xhr, arguments);
        }).catch((error) => {
            console.error('Mock XHR failed:', error);
            if (this.onerror) this.onerror(error);
        });
    };

    MockXHR.prototype.abort = function() {
        if (this.xhr) this.xhr.abort();
    };

    Object.defineProperty(MockXHR.prototype, 'responseType', {
        get: function() {
            return this.xhr.responseType;
        },
        set: function(value) {
            this.xhr.responseType = value;
        }
    });

    Object.defineProperty(MockXHR.prototype, 'timeout', {
        get: function() {
            return this.xhr.timeout;
        },
        set: function(value) {
            this.xhr.timeout = value;
        }
    });

    window.XMLHttpRequest = MockXHR;

    window.WebSocket = function(url, protocols) {
        if (typeof url === 'string' && (url.includes('/mqtt') || url.includes('/middle/ws/block-running'))) {
            this.url = url;
            this.protocol = '';
            this.readyState = 0;
            this.bufferedAmount = 0;
            setTimeout(() => {
                this.readyState = 3;
                if (typeof this.onerror === 'function') this.onerror(new Event('error'));
                if (typeof this.onclose === 'function') this.onclose(new CloseEvent('close'));
            }, 0);
            this.send = function() {};
            this.close = function() {
                this.readyState = 3;
            };
            return;
        }
        return new OriginalWebSocket(url, protocols);
    };

    window.localStorage.setItem('hflow_locale', 'zh-cn');
    window.localStorage.setItem('hflow_token', 'mock-token');

    if (!window.localStorage.getItem('hflow_role')) {
        try {
            const roleRequest = new OriginalXHR();
            roleRequest.open('GET', '../../docs/fixtures-role-2.json', false);
            roleRequest.send();
            const rolePayload = JSON.parse(roleRequest.responseText || '{}');
            if (rolePayload?.data) {
                window.localStorage.setItem('hflow_role', JSON.stringify(rolePayload.data));
            }
        } catch (error) {
            console.warn('failed to seed hflow_role', error);
        }
    }
})();
