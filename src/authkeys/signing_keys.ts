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
    instance_name: config.instance_name,
    alg: config.signing_algorithm,
    kid: config.key_id,
  };
}
