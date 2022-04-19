/*
 * Copyright 2021, 2022 Macquarie University
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
 * Filename: src/authkeys/signing_keys.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import {open} from 'fs/promises';
import {importPKCS8, importSPKI} from 'jose';

import type {KeyConfig, SigningKey} from './types';

export async function load_signing_key(config: KeyConfig): Promise<SigningKey> {
  let filehandle;
  let private_key_string;
  let public_key_string;
  try {
    filehandle = await open(config.private_key_file, 'r');
    private_key_string = await filehandle.readFile('utf-8');
  } finally {
    await filehandle?.close();
  }
  try {
    filehandle = await open(config.public_key_file, 'r');
    public_key_string = await filehandle.readFile('utf-8');
  } finally {
    await filehandle?.close();
  }

  const private_key = await importPKCS8(
    private_key_string,
    config.signing_algorithm
  );
  const public_key = await importSPKI(
    public_key_string,
    config.signing_algorithm
  );
  return {
    private_key: private_key,
    public_key: public_key,
    public_key_string: public_key_string,
    instance_name: config.instance_name,
    alg: config.signing_algorithm,
    kid: config.key_id,
  };
}
