import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemConfigDto } from './create-system-config.dto';

export class UpdateSystemConfigDto extends PartialType(CreateSystemConfigDto) {}
