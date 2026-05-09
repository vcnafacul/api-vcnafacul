import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OpenConversationDto } from './open-conversation.dto';

const validMetadata = {
  page: '/cursinho/inscricao/some-uuid',
  userAgent: 'Mozilla/5.0',
  device: 'mobile' as const,
  browser: 'Chrome',
};

describe('OpenConversationDto', () => {
  it('accepts dto without inscription context', async () => {
    const dto = plainToInstance(OpenConversationDto, {
      metadata: validMetadata,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts dto with inscriptionCourseId', async () => {
    const dto = plainToInstance(OpenConversationDto, {
      metadata: validMetadata,
      inscriptionCourseId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts dto with studentCourseId', async () => {
    const dto = plainToInstance(OpenConversationDto, {
      metadata: validMetadata,
      studentCourseId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects non-UUID inscriptionCourseId', async () => {
    const dto = plainToInstance(OpenConversationDto, {
      metadata: validMetadata,
      inscriptionCourseId: 'not-a-uuid',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects non-UUID studentCourseId', async () => {
    const dto = plainToInstance(OpenConversationDto, {
      metadata: validMetadata,
      studentCourseId: 12345,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
