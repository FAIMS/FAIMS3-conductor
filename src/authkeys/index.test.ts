/*
 * Copyright 2021 Macquarie University
 *
 * Licensed under the Apache License Version 2.0 (the, "License");
 * you may not use, this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND either express or implied.
 * See, the License, for the specific language governing permissions and
 * limitations under the License.
 *
 * Filename: src/authkeys/index.test.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import {testProp, fc} from 'jest-fast-check';
import {importPKCS8, importSPKI} from 'jose';

import {create_auth_key} from './create';
import {read_auth_key} from './read';
import type {CouchDBUsername, CouchDBUserRoles, SigningKey} from './types';

const SIGNING_ALGORITHM = 'RS256';
const INSTANCE_NAME = 'test';
const KEY_ID = 'test_id';

const TEST_PRIVATE_KEY_STRING = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9xxHhgTqgFP5J
Es2UMnI3zdTcdLXgM9hS/TWiBt3fB/QhD2EYlTLPKm6AA8IYJvHIAfYLTTib4XKV
5ib0Eq26/L7dCj/MyjuBgFuRdFtdOXYzQEteMEtolnCsfqgreoGN0Z0EI8y3Furm
SRxh21PbR24iKYCcrb8W56tZMJefWSqEjOMAQibhhrzp0D+HNaBFxQiqPFs1ROMx
5tAqv8CYN3gHppZN5AB1VDSksWqvox5LFwwLx5WjsK7o7bw6m8RAHZYAaspFMDEY
SapZSGrDO0WW1FkoOW4UvGoARaCIymkEipKIaZ0Fsv6tUq2noBxAiqPL98UupHo/
NpwyomUrAgMBAAECggEAGvrDEwEROZLid7cBnPDzBfXwLgs1lBMqzNmMl2VMg5mY
3l5WWm1TlNoebXqbTF20/88vkHnA84BAjwjyPr6tDilCZSBA47dYcFe0LOCS4JT7
tduNG23YOp0wlYVIGS5IXsYPAXipcNoEOQrpywuoR0NHZ/noe93DjdkPphVfaNrA
bkQt8FNZVw7Zpb6K52UwOhfVN8sRpd60NTDCwkM6J5RUocIEkjlOILEgwe0443NG
v7c3O/9/NXPwQ2NWAqGwgmRTjUiQNnBDLR4Lbeb0K+BjoV4cBYavgw1vlR2B46SM
HvVWEy8pZJwY5vIpyR2WmED5lBfRlHIhnTgR8WD1uQKBgQDuznvyK4HsMXUbwDI+
TkjRJ9tGFqUjmi1JbRib2ECwt9lekhbQC1dmA7qJeQyDtzVLBjo1E0iSmjxTagPn
LrPvC68MJ+9PuYMcyN1oD51oAM/s8kNFWPOYD68rNk1m3nbCCpexQi7BJCbB6MdF
IDdbLcm/3J4bIJlxGYsf8TCxVQKBgQDLcOsLeDOc59dcEeZONrJncI+u28qdKUYy
7TJwzDfi0e3S86JW8gS/wdM4SgGkGeskDPLZkzl9gHOtpFj957oiob0KcnVWd/1g
cAgXbPcJYtAIxl7Bxj2zrl1EbxoTjRRhSBt2Sx1ALVepFFzJrcGfJNhOGlceMQBY
fXdppEC8fwKBgQDWzufRC2+/zTEhOD45q2N2uFpWbnI3Vy0bWkYDkX+HNqkRl2lr
1HfWbM4zcK5gIMGQbdaX/XOPY6uWAMvn/SufgCwCTD3Iwf99OfVm8HzPm8NsyPLY
A06C3sDbpuny+XNr0elnajfyRhmS3Ve6B2Oj4ckTi1iw4B8GDEsH/YWmTQKBgQCp
EKLUOkUyLN0lD18EOqJSIhHV76PWrZk/8yzK3nvHDEyG1Z9gf+oAbZQZoC7y7/Mg
V35t39KUAG6hrAWko7Fk3GJcTzhB7p9rSE8BILW/YBWgZTIT+KoIK2wo1eemvcRk
/+aKjOu3DLdftKNTmwlgNt9nMK6bUX+HCmV1LmH6AwKBgHKTC1NK+hxifG/+bQ4x
aeaqje+Fzb7Bl97yrLQQE7fET9u+96AVQmwAbayBiqGaeNWVnmiXTkMu0kTzr3+F
nXWjYKUNerwCqryDFerw4fTdTcocKQYJoqz4wRvr5ZpBbfMzNQFwLUTDrwPuLyZc
Gll2TbCPvY4lYaKgIBzBmDds
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY_STRING = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvccR4YE6oBT+SRLNlDJy
N83U3HS14DPYUv01ogbd3wf0IQ9hGJUyzypugAPCGCbxyAH2C004m+FyleYm9BKt
uvy+3Qo/zMo7gYBbkXRbXTl2M0BLXjBLaJZwrH6oK3qBjdGdBCPMtxbq5kkcYdtT
20duIimAnK2/FuerWTCXn1kqhIzjAEIm4Ya86dA/hzWgRcUIqjxbNUTjMebQKr/A
mDd4B6aWTeQAdVQ0pLFqr6MeSxcMC8eVo7Cu6O28OpvEQB2WAGrKRTAxGEmqWUhq
wztFltRZKDluFLxqAEWgiMppBIqSiGmdBbL+rVKtp6AcQIqjy/fFLqR6PzacMqJl
KwIDAQAB
-----END PUBLIC KEY-----`;

async function get_test_key(): Promise<SigningKey> {
  const private_key = await importPKCS8(
    TEST_PRIVATE_KEY_STRING,
    SIGNING_ALGORITHM
  );
  const public_key = await importSPKI(
    TEST_PUBLIC_KEY_STRING,
    SIGNING_ALGORITHM
  );
  return {
    private_key: private_key,
    public_key: public_key,
    public_key_string: TEST_PUBLIC_KEY_STRING,
    instance_name: INSTANCE_NAME,
    alg: SIGNING_ALGORITHM,
    kid: KEY_ID,
  };
}

describe('roundtrip creating and reading token', () => {
  testProp(
    'token roundtrip',
    [
      fc.fullUnicodeString(), // username name
      fc.array(fc.fullUnicodeString()), // roles
    ],
    async (username: CouchDBUsername, roles: CouchDBUserRoles) => {
      const signing_key = await get_test_key();

      return create_auth_key(username, roles, signing_key)
        .then(token => {
          return read_auth_key(token, signing_key);
        })
        .then(token_props => {
          console.log(token_props);
          expect(username).toBe(token_props.username);
          expect(roles).toStrictEqual(token_props.roles);
          expect(INSTANCE_NAME).toBe(token_props.instance_name);
          expect(KEY_ID).toBe(token_props.key_id);
        });
    }
  );
});
