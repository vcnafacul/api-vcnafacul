import {
  AnswerCollectionType,
  AnswerType,
} from '../../question/dtos/create-question.dto.input';

export class QuestionDtoOutput {
  _id: string;
  text: string;
  helpText: string;
  answerType: AnswerType;
  collection: AnswerCollectionType;
  options?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class SectionDtoOutput {
  _id: string;
  name: string;
  active: boolean;
  questions: QuestionDtoOutput[];
  createdAt: Date;
  updatedAt: Date;
}
