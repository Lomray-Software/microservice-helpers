import { Allow, Length } from 'class-validator';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Entity with the composite primary key
 */
@Entity()
class CompositeTestEntity {
  @PrimaryColumn()
  @Allow()
  id1: string;

  @PrimaryColumn()
  @Allow()
  id2: string;

  @Column()
  @Length(1, 50)
  param: string;
}

export default CompositeTestEntity;
