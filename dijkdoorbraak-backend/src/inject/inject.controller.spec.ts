import { Test, TestingModule } from '@nestjs/testing';
import { InjectController } from './inject.controller';

describe('InjectController', () => {
  let controller: InjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InjectController],
    }).compile();

    controller = module.get<InjectController>(InjectController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
