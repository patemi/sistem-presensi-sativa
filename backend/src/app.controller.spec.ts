import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const mockMailerService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
