import { SelectQueryBuilder } from 'typeorm';

export interface IBatchFindOptions {
  chunkSize?: number;
  // Timeout in ms
  timeout?: number;
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
    const { chunkSize = 50, timeout } = options;

    let skip = 0;
    let count = 0;
    let index = 0;
    let exitProcessTime: number | null = null;

    if (timeout) {
      exitProcessTime = Date.now() + timeout;
    }

    const isTimeoutNotExceeded = !exitProcessTime || exitProcessTime > Date.now();

    do {
      const chunkEntities = await query.skip(skip).take(chunkSize).getMany();

      skip += chunkSize;
      count = chunkEntities.length;

      await callback(chunkEntities, index);

      index++;
    } while (count === chunkSize && isTimeoutNotExceeded);
  }
}

export default Batch;
