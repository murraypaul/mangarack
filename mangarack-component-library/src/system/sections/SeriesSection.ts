import * as mio from '../module';

/**
 * Represents a series section.
 */
export class SeriesSection implements mio.ISeriesLibrary {
  private _context: mio.IContext;
  private _userId: number;

  /**
   * Initializes a new instance of the SeriesSection class.
   * @param context The context.
   * @param userId The user identifier.
   */
  constructor(context: mio.IContext, userId: number) {
    this._context = context;
    this._userId = userId;
  }

  /**
   * Promises a chapter library for the series.
   * @param seriesId The series identifier.
   * @return The promise for the chapter library for the series.
   */
  chaptersAsync(seriesId: number): Promise<mio.IOption<mio.IChapterLibrary>> {
    throw new Error('TODO: Not implemented');
  }

  /**
   * Promises to create the series.
   * @param address The address.
   * @return The promise to create the series.
   */
  createAsync(address: string): Promise<mio.IOption<number>> {
    throw new Error('TODO: Not implemented');
  }

  /**
   * Promises to delete the series.
   * @param seriesId The series identifier.
   * @return The promise to delete the series.
   */
  async deleteAsync(seriesId: number): Promise<boolean> {
    let match = mio.findChild(this._context.providers, provider => provider.series, series => series.id === seriesId);
    if (match.value != null) {
      /* TODO: Delete all chapters, too, to clean up the entire tree of contexts. */
      delete this._context.providers[match.value[0]].series[match.value[1]];
      await mio.contextService.writeContext();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Promises to enqueue a high priority download for the library.
   * @param recursive If true, enqueues low priority downloads for new chapters.
   * @return The promise to enqueue a high priority download for the library.
   */
  downloadAsync(recursive: boolean): Promise<mio.IOption<number>> {
    throw new Error('TODO: Not implemented');
  }

  /**
   * Promises a list of series.
   * @return The promise for the list of series.
   */
  viewAsync(): Promise<mio.ISeriesLibraryItem[]> {
    return Promise.resolve(mio.mapChild(this._context.providers, provider => provider.series, (series, seriesAddress, providerName) => ({
      addedAt: series.users[this._userId],
      chapterAddedAt: 0, /* TODO: Add the query. */
      chapterLastReadAt: 0, /* TODO: Add the query. */
      checkedAt: series.checkedAt,
      id: series.id,
      metadata: series.metadata,
      numberOfChapters: Object.keys(series.chapters).length,
      numberOfReadChapters: 0, /* TODO: Add the query. */
      providerName: providerName,
      seriesAddress: seriesAddress
    })));
  }
}
