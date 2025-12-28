import { Injectable } from '@nestjs/common';
import { BorrowersRepository } from './borrowers.repository';
import { BorrowerSuggestion } from '@radio-inventar/shared';

@Injectable()
export class BorrowersService {
  constructor(private readonly borrowersRepository: BorrowersRepository) {}

  async getSuggestions(query: string, limit?: number): Promise<BorrowerSuggestion[]> {
    return this.borrowersRepository.findSuggestions(query, limit ?? 10);
  }
}
