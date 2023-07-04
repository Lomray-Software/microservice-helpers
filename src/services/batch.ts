import { SelectQueryBuilder } from 'typeorm';

export interface IBatchFindOptions {
  chunkSize?: number;
}

/**
 * Batch service for typeorm
 */
class Batch {
  /**
   * Find entities and resolve callback
   */
  public static async find<TEntity>(
    query: SelectQueryBuilder<TEntity>,
    callback: (entities: TEntity[], index: number) => Promise<void> | void,
    options: IBatchFindOptions = {},
  ): Promise<void> {
    const { chunkSize = 50 } = options;

    let skip = 0;
    let count = 0;
    let index = 0;

    do {
      const chunkEntities = await query.skip(skip).take(chunkSize).getMany();

      skip += chunkSize;
      count = chunkEntities.length;

      await callback(chunkEntities, index);

      index++;
    } while (count === chunkSize);
  }
}

export default Batch;
