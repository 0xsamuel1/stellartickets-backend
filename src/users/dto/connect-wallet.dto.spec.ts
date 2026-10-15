import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConnectWalletDto } from './connect-wallet.dto';

describe('ConnectWalletDto', () => {
  it('accepts a valid Stellar public key', async () => {
    const dto = plainToInstance(ConnectWalletDto, {
      stellarPublicKey:
        'GBAHZWO3UI3GAHPQCPSW6IR5N7HJ4UBRZNAFMSYB6DAKVNHQDOZIV2YJ',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a malformed public key', async () => {
    const dto = plainToInstance(ConnectWalletDto, {
      stellarPublicKey: 'not-a-key',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stellarPublicKey')).toBe(true);
  });

  it('rejects a well-formed G-address with a bad checksum', async () => {
    const dto = plainToInstance(ConnectWalletDto, {
      // Last character flipped from a valid key, breaking the strkey CRC16.
      stellarPublicKey:
        'GBAHZWO3UI3GAHPQCPSW6IR5N7HJ4UBRZNAFMSYB6DAKVNHQDOZIV2YK',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stellarPublicKey')).toBe(true);
  });

  it('rejects a contract address (C...) where a public key belongs', async () => {
    const dto = plainToInstance(ConnectWalletDto, {
      stellarPublicKey:
        'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stellarPublicKey')).toBe(true);
  });
});
