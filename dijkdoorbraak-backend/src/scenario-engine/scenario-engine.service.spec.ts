import { Test, TestingModule } from '@nestjs/testing';
import { ScenarioEngineService } from './scenario-engine.service';

describe('ScenarioEngineService', () => {
  let service: ScenarioEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScenarioEngineService],
    }).compile();

    service = module.get<ScenarioEngineService>(ScenarioEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
