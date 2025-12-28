import { Injectable } from '@nestjs/common';
import { LoansRepository } from './loans.repository';
import { ActiveLoanResponseDto } from './dto/active-loan-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanResponseDto } from './dto/create-loan-response.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { ReturnLoanResponseDto } from './dto/return-loan-response.dto';

@Injectable()
export class LoansService {
  constructor(private readonly loansRepository: LoansRepository) {}

  async findActive(take?: number, skip?: number): Promise<ActiveLoanResponseDto[]> {
    // Service-level logging removed - Controller handles logging, Repository handles debug
    return this.loansRepository.findActive({
      ...(take !== undefined && { take }),
      ...(skip !== undefined && { skip }),
    });
  }

  async create(dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    // Service just delegates to repository, no logging
    return this.loansRepository.create(dto);
  }

  /**
   * Returns a loan with optional return note.
   *
   * H3 Fix: Null handling pattern documentation
   * NOTE: This method uses `??` operator (dto.returnNote ?? null) instead of the spread
   * pattern used in findActive method. This is intentional and correct:
   *
   * - findActive: Spread pattern omits undefined values from object ({...(take !== undefined && { take })})
   *   → Purpose: Optional parameters should be omitted entirely if not provided (not passed as undefined)
   *
   * - returnLoan: Direct ?? operator provides explicit null fallback for nullable field
   *   → Purpose: returnNote is a nullable database field that requires explicit null value (not undefined)
   *
   * The patterns differ because:
   * - findActive parameters are optional pagination options (undefined = use default, so omit from object)
   * - returnNote is a nullable database field (undefined = no note, must convert to null for Prisma)
   *
   * No defensive copy needed for dto.returnNote because:
   * 1. DTO comes from class-validator/class-transformer pipeline (already validated & transformed)
   * 2. returnNote is a primitive type (string | null), not a mutable object
   * 3. Primitives are passed by value in JavaScript, not by reference
   */
  async returnLoan(loanId: string, dto: ReturnLoanDto): Promise<ReturnLoanResponseDto> {
    return this.loansRepository.returnLoan(loanId, dto.returnNote ?? null);
  }
}
