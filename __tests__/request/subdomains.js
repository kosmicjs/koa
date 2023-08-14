'use strict';

const assert = require('node:assert');
const request = require('../../test-helpers/context').request;

describe('req.subdomains', () => {
  it('should return subdomain array', () => {
    const request_ = request();
    request_.header.host = 'tobi.ferrets.example.com';
    request_.app.subdomainOffset = 2;
    assert.deepStrictEqual(request_.subdomains, ['ferrets', 'tobi']);

    request_.app.subdomainOffset = 3;
    assert.deepStrictEqual(request_.subdomains, ['tobi']);
  });

  it('should work with no host present', () => {
    const request_ = request();
    assert.deepStrictEqual(request_.subdomains, []);
  });

  it('should check if the host is an ip address, even with a port', () => {
    const request_ = request();
    request_.header.host = '127.0.0.1:3000';
    assert.deepStrictEqual(request_.subdomains, []);
  });
});
